/**
 * interview.ai.js — Gemini-powered AI helpers for the interview module
 *
 * Replaces the previous OpenAI implementation with @google/generative-ai.
 * All functions gracefully fall back to mock data when:
 *   - GEMINI_API_KEY is a placeholder / invalid
 *   - The API returns an error (quota, network, etc.)
 *
 * Functions exported:
 *   generateFirstQuestion(resumeData, roleApplied) → { question, context }
 *   evaluateAnswer(question, answer, roleApplied)  → { score, feedback, isSatisfactory, followUpNeeded }
 *   generateNextQuestion(chatHistory)              → { question, context }
 *   generateFinalReport(fullConversation)          → { finalScore, summary, strengths, weaknesses, missingSkills, skillBreakdown, recommendedCourses }
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../../config/env.js';
import ApiError from '../../utils/ApiError.js';

// ── Gemini client ─────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

/**
 * Returns true only when a real (non-placeholder) Gemini key is configured.
 */
const hasValidKey = () =>
    config.geminiApiKey &&
    !config.geminiApiKey.startsWith('REPLACE_') &&
    config.geminiApiKey !== 'your_gemini_api_key_here';

/**
 * Shared helper: send a prompt to Gemini and parse the JSON response.
 * Wraps the response in a try/catch so callers get a clean fallback path.
 *
 * @param {string} prompt
 * @returns {Promise<Object>} parsed JSON object from Gemini
 */
const askGemini = async (prompt) => {
    const model = genAI.getGenerativeModel({ model: config.geminiModel });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Strip markdown fences if Gemini wraps JSON in ```json ... ```
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    return JSON.parse(clean);
};

// ── Mock responses (used when API key is absent or on error) ──────────────────
const MOCK_FIRST_Q = (roleApplied) => ({
    question: `Could you walk me through a challenging project you've worked on relevant to ${roleApplied}?`,
    context: 'Initial screening — understanding candidate background.',
});

const MOCK_EVAL = () => ({
    score: 75,
    feedback: 'Good answer covering the main points. Consider going deeper on technical trade-offs.',
    isSatisfactory: true,
    followUpNeeded: false,
});

const MOCK_NEXT_Q = () => ({
    question: 'How do you approach error handling in asynchronous Node.js code?',
    context: 'Deep-dive into technical fundamentals.',
});

const MOCK_REPORT = () => ({
    finalScore: 78,
    summary: 'The candidate demonstrated solid foundational knowledge with room to grow in system design.',
    strengths: ['Communication', 'React proficiency', 'Problem-solving approach'],
    weaknesses: ['System Design depth', 'Database optimisation'],
    missingSkills: ['Docker', 'GraphQL', 'Redis'],
    skillBreakdown: { React: 85, 'Node.js': 80, SQL: 70, 'System Design': 60 },
    recommendedCourses: ['System Design Masterclass', 'Docker & Kubernetes', 'GraphQL Complete Guide'],
});

// ── Public functions ──────────────────────────────────────────────────────────

/**
 * Generate the opening interview question based on the candidate's resume.
 */
const generateFirstQuestion = async (resumeData, roleApplied) => {
    if (!hasValidKey()) {
        console.warn('⚠️  GEMINI_API_KEY not configured — using mock first question');
        return MOCK_FIRST_Q(roleApplied);
    }

    const prompt = `
You are an expert technical interviewer conducting a voice mock interview.
Role applied for: ${roleApplied}
Candidate resume summary: ${JSON.stringify(resumeData)}

Generate the FIRST interview question. Make it open-ended, relevant to the role, and based on the resume.
Respond ONLY with valid JSON (no markdown fences):
{
  "question": "The interview question text",
  "context": "Brief internal note on why you asked this"
}`;

    try {
        return await askGemini(prompt);
    } catch (err) {
        console.warn('⚠️  Gemini generateFirstQuestion failed — using mock:', err.message);
        return MOCK_FIRST_Q(roleApplied);
    }
};

/**
 * Evaluate the candidate's answer to a question and score it 0-100.
 */
const evaluateAnswer = async (currentQuestion, userAnswer, roleApplied) => {
    if (!hasValidKey()) {
        console.warn('⚠️  GEMINI_API_KEY not configured — using mock evaluation');
        return MOCK_EVAL();
    }

    const prompt = `
You are an expert technical interviewer evaluating a candidate's spoken answer.
Role: ${roleApplied}
Question asked: "${currentQuestion}"
Candidate's answer: "${userAnswer}"

Evaluate the answer objectively. Respond ONLY with valid JSON (no markdown fences):
{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentence constructive feedback>",
  "isSatisfactory": <true|false>,
  "followUpNeeded": <true|false>
}`;

    try {
        return await askGemini(prompt);
    } catch (err) {
        console.warn('⚠️  Gemini evaluateAnswer failed — using mock:', err.message);
        return MOCK_EVAL();
    }
};

/**
 * Generate the next question based on the conversation history so far.
 */
const generateNextQuestion = async (chatHistory) => {
    if (!hasValidKey()) {
        console.warn('⚠️  GEMINI_API_KEY not configured — using mock next question');
        return MOCK_NEXT_Q();
    }

    // Only send the last 6 messages to keep the prompt short
    const recentHistory = chatHistory.slice(-6).map(m => `${m.role}: ${m.text}`).join('\n');

    const prompt = `
You are an expert technical interviewer. Below is the recent interview conversation history.
${recentHistory}

Based on the candidate's answers so far, generate the NEXT most appropriate technical interview question.
Respond ONLY with valid JSON (no markdown fences):
{
  "question": "The next interview question",
  "context": "Brief internal note on why you chose this question"
}`;

    try {
        return await askGemini(prompt);
    } catch (err) {
        console.warn('⚠️  Gemini generateNextQuestion failed — using mock:', err.message);
        return MOCK_NEXT_Q();
    }
};

/**
 * Generate a final interview performance report from the full transcript.
 */
const generateFinalReport = async (fullConversation) => {
    if (!hasValidKey()) {
        console.warn('⚠️  GEMINI_API_KEY not configured — using mock report');
        return MOCK_REPORT();
    }

    const transcript = fullConversation
        .map(m => `${m.role.toUpperCase()}: ${m.text}`)
        .join('\n');

    const prompt = `
You are a senior technical interviewer. Below is the complete transcript of a mock interview.
${transcript}

Generate a comprehensive performance report. Respond ONLY with valid JSON (no markdown fences):
{
  "finalScore": <integer 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "missingSkills": ["<skill 1>", "<skill 2>"],
  "skillBreakdown": { "<SkillName>": <score_0_to_100>, ... },
  "recommendedCourses": ["<course topic 1>", "<course topic 2>"]
}`;

    try {
        return await askGemini(prompt);
    } catch (err) {
        console.warn('⚠️  Gemini generateFinalReport failed — using mock:', err.message);
        return MOCK_REPORT();
    }
};

export default {
    generateFirstQuestion,
    evaluateAnswer,
    generateNextQuestion,
    generateFinalReport,
};
