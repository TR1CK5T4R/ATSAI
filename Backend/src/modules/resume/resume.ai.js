/**
 * resume.ai.js — Gemini-powered resume structuring
 *
 * Pipeline guarantees:
 *  1. STRICT JSON: Gemini is called with generationConfig.responseMimeType
 *     'application/json' + a native responseSchema, so the model is forced
 *     into our exact shape at the API level (not just prompt-parsed).
 *  2. VALIDATION: the returned JSON is re-validated/coerced with Joi
 *     (resume.validation.js → RESUME_PARSED_SCHEMA) — LLMs drift, schemas don't.
 *  3. RETRY: up to MAX_ATTEMPTS tries with exponential backoff + jitter.
 *     Retries cover transient API failures (429/5xx/network) AND schema-validation
 *     failures. Permanent errors (invalid key, unknown model, bad request) fail
 *     fast — retrying them only adds latency.
 *  4. CLEAR ERROR: after the final attempt a descriptive ApiError(502) is
 *     thrown — we deliberately do NOT silently fall back to mock data for
 *     real API failures (unlike interview.ai.js), because a resume record
 *     built from fabricated data would poison downstream interviews.
 *     An explicit dev-only GEMINI_MOCK=true opt-in exists for offline work.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import config from '../../config/env.js';
import ApiError from '../../utils/ApiError.js';
import { validateParsedResume, SENIORITY_LEVELS } from './resume.validation.js';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 750; // backoff: 750ms, 1500ms (+ jitter)

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

/**
 * True only when a real (non-placeholder) Gemini key is configured.
 */
const hasValidKey = () =>
    Boolean(config.geminiApiKey) &&
    !config.geminiApiKey.startsWith('REPLACE_') &&
    config.geminiApiKey !== 'your_gemini_api_key_here';

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
 * One Gemini call → parsed JSON object.
 * (responseSchema + responseMimeType make malformed JSON practically impossible;
 * JSON.parse is kept as a final safety net.)
 *
 * The client is created per call (cheap) so that a key rotated via env/config
 * takes effect without a process restart — and so tests can simulate failures.
 */
const getClient = () =>
    genAI.getGenerativeModel({
        model: config.geminiModel,
        generationConfig: {
            temperature: 0.1, // near-deterministic for extraction tasks
            responseMimeType: 'application/json',
            responseSchema: RESUME_SCHEMA,
        },
    });

const callGeminiOnce = async (resumeText) => {
    const model = getClient();
    const result = await model.generateContent(buildPrompt(resumeText));
    const text = result.response.text();
    return JSON.parse(text);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gemini fetch errors carry an HTTP `status`. 400/401/403/404 mean the key,
 * model name or request is wrong — identical on every retry, so stop early.
 * Everything else (429 quota, 5xx, network, bad JSON, schema drift) is retried.
 */
const PERMANENT_STATUSES = new Set([400, 401, 403, 404]);
const isPermanentError = (err) => PERMANENT_STATUSES.has(err?.status);

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
    if (config.geminiMock) {
        console.warn('🧪 GEMINI_MOCK=true — returning deterministic mock resume parse (no API call)');
        return MOCK_PARSED_RESUME();
    }

    if (!hasValidKey()) {
        throw new ApiError(
            503,
            'GEMINI_API_KEY is not configured — add it to Backend/.env, or set GEMINI_MOCK=true for offline development'
        );
    }

    let lastError;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const raw = await callGeminiOnce(resumeText);

            const { error, value } = validateParsedResume(raw);
            if (error) {
                throw new Error(
                    `schema validation failed: ${error.details.map((d) => d.message).join('; ')}`
                );
            }
            return value;
        } catch (err) {
            lastError = err;
            console.warn(`⚠️  Gemini resume parse failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message}`);

            if (isPermanentError(err)) break;
            if (attempt < MAX_ATTEMPTS) {
                // Exponential backoff + jitter avoids thundering-herd retries
                await sleep(BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 250);
            }
        }
    }

    // Raw provider details stay in the server log above; the client gets a clear, safe message
    if (isPermanentError(lastError)) {
        throw new ApiError(
            502,
            `AI resume parsing is misconfigured (Gemini returned ${lastError.status}) — check GEMINI_API_KEY and GEMINI_MODEL.`
        );
    }
    throw new ApiError(
        502,
        `AI resume parsing failed after ${MAX_ATTEMPTS} attempts. Please try again shortly.`
    );
};

export { parseResumeWithGemini, RESUME_SCHEMA };

