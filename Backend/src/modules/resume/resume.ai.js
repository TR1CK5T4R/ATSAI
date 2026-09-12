/**
 * resume.ai.js — Gemini-powered resume structuring
 *
 * Pipeline guarantees:
 *  1. STRICT JSON: Gemini is called with generationConfig.responseMimeType
 *     'application/json' + a native responseSchema, so the model is forced
 *     into our exact shape at the API level (not just prompt-parsed).
 *  2. VALIDATION: the returned JSON is re-validated/coerced with Joi
 *     (resume.validation.js → RESUME_PARSED_SCHEMA) — LLMs drift, schemas don't.
 *  3. RETRY: up to 3 tries with exponential backoff + jitter (shared logic in
 *     src/services/llm/gemini.client.js).
 *     Retries cover transient API failures (429/5xx/network) AND schema-validation
 *     failures. Permanent errors (invalid key, unknown model, bad request) fail
 *     fast — retrying them only adds latency.
 *  4. CLEAR ERROR: after the final attempt a descriptive ApiError(502) is
 *     thrown — we deliberately do NOT silently fall back to mock data for
 *     real API failures (unlike interview.ai.js), because a resume record
 *     built from fabricated data would poison downstream interviews.
 *     An explicit dev-only GEMINI_MOCK=true opt-in exists for offline work.
 */

import { SchemaType } from '@google/generative-ai';
import {
    isMockMode,
    assertConfigured,
    generateJson,
    withRetry,
} from '../../services/llm/gemini.client.js';
import { validateParsedResume, SENIORITY_LEVELS } from './resume.validation.js';

/**
 * Native Gemini response schema — the strict JSON contract.
 * Every field the product needs is declared here; the API rejects responses
 * that do not conform before we ever parse them.
 */
const RESUME_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        name: { type: SchemaType.STRING },
        email: { type: SchemaType.STRING },
        skills: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
        },
        experience: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    title: { type: SchemaType.STRING, nullable: true },
                    company: { type: SchemaType.STRING, nullable: true },
                    startDate: { type: SchemaType.STRING, nullable: true },
                    endDate: { type: SchemaType.STRING, nullable: true },
                    description: { type: SchemaType.STRING, nullable: true },
                },
            },
        },
        education: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    degree: { type: SchemaType.STRING, nullable: true },
                    institution: { type: SchemaType.STRING, nullable: true },
                    year: { type: SchemaType.STRING, nullable: true },
                },
            },
        },
        projects: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    name: { type: SchemaType.STRING, nullable: true },
                    description: { type: SchemaType.STRING, nullable: true },
                    technologies: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                },
            },
        },
        experienceYears: { type: SchemaType.NUMBER },
        seniorityLevel: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: SENIORITY_LEVELS,
        },
    },
    required: [
        'name',
        'email',
        'skills',
        'experience',
        'education',
        'projects',
        'experienceYears',
        'seniorityLevel',
    ],
};

const buildPrompt = (resumeText) => `
You are an expert technical recruiter and resume parser.
Extract structured data from the resume text below.

Rules:
- Respond ONLY with JSON that matches the provided schema. No markdown, no commentary.
- Use "" for unknown strings, 0 for unknown numbers, [] for unknown lists.
- Normalise skills to their common industry names (e.g. "React.js" → "React", "Node JS" → "Node.js").
- experienceYears: total professional experience in years (number, 1 decimal allowed).
- seniorityLevel: best guess from ${JSON.stringify(SENIORITY_LEVELS)}.
- Do not invent data that is not implied by the resume text.

RESUME TEXT:
"""
${resumeText}
"""`.trim();

/**
 * Dev-only deterministic sample (used when GEMINI_MOCK=true).
 * Matches RESUME_PARSED_SCHEMA exactly so the whole downstream pipeline
 * (validation → PG → Mongo → GET) can be exercised without an API key.
 */
const MOCK_PARSED_RESUME = () =>
    JSON.parse(
        JSON.stringify({
            name: 'Aarav Sharma',
            email: 'aarav.sharma@example.com',
            skills: [
                'JavaScript', 'TypeScript', 'React', 'Redux', 'Node.js',
                'Express', 'PostgreSQL', 'MongoDB', 'Docker', 'AWS',
            ],
            experience: [
                {
                    title: 'Software Engineer',
                    company: 'Finlytics Pvt Ltd',
                    startDate: '2022-07',
                    endDate: 'Present',
                    description:
                        'Built REST APIs with Node.js and Express serving 50k daily users; migrated legacy React components to TypeScript.',
                },
                {
                    title: 'Junior Developer',
                    company: 'WebNest Solutions',
                    startDate: '2021-01',
                    endDate: '2022-06',
                    description: 'Developed responsive UI with React and Tailwind CSS.',
                },
            ],
            education: [
                {
                    degree: 'B.Tech in Computer Science',
                    institution: 'VTU Bengaluru',
                    year: '2020',
                },
            ],
            projects: [
                {
                    name: 'HireFlow',
                    description: 'ATS resume screening tool built with the MERN stack.',
                    technologies: ['MongoDB', 'Express', 'React', 'Node.js'],
                },
                {
                    name: 'CropSense',
                    description: 'ML-powered crop advisory progressive web app.',
                    technologies: ['Python', 'TensorFlow', 'React'],
                },
            ],
            experienceYears: 3.5,
            seniorityLevel: 'Mid',
        })
    );

/**
 * Parse a resume's raw text into the validated structured object.
 *
 * @param {string} resumeText - plain text extracted by resume.parser.js
 * @returns {Promise<Object>} validated parsed resume (RESUME_PARSED_SCHEMA shape)
 * @throws ApiError 503 when no API key is configured
 * @throws ApiError 502 when parsing fails on every retry attempt
 */
const parseResumeWithGemini = async (resumeText) => {
    // Explicit offline/dev mode — opt-in via env, never a silent fallback
    if (isMockMode()) {
        console.warn('🧪 GEMINI_MOCK=true — returning deterministic mock resume parse (no API call)');
        return MOCK_PARSED_RESUME();
    }

    assertConfigured();

    // Retry covers API failures AND schema-validation failures (see gemini.client.js)
    return withRetry(
        async () => {
            const raw = await generateJson({
                prompt: buildPrompt(resumeText),
                schema: RESUME_SCHEMA,
                temperature: 0.1, // near-deterministic for extraction tasks
            });

            const { error, value } = validateParsedResume(raw);
            if (error) {
                throw new Error(
                    `schema validation failed: ${error.details.map((d) => d.message).join('; ')}`
                );
            }
            return value;
        },
        { label: 'resume parsing' }
    );
};

export { parseResumeWithGemini, RESUME_SCHEMA };

