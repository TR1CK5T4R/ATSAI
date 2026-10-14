/**
 * interview.ai.js — Gemini prompts + schemas for the interview module
 *
 *   generateQuestions(resumeContext, targetRole) → [{ id, type, text }] × 8
 *       GEMINI_MODEL, strict JSON, Joi-validated, retried (502 on failure).
 *
 *   nextTurn({ ... })                            → { action, text, source }
 *       GEMINI_FAST_MODEL (lightweight) + small output budget + hard timeout,
 *       because this runs between the candidate speaking and the AI replying.
 *       Never throws: on timeout/error it falls back to moving on to the next
 *       planned question (source: 'fallback') so the voice flow never stalls.
 *       Not retried — a retry would blow the ~1.5–2 s latency budget.
 *
 *   generateReport({ ... })                      → { score, summary, strengths, weaknesses, skillGaps, skillBreakdown }
 *       GEMINI_MODEL, strict JSON, Joi-validated, retried (502 on failure).
 *       No silent mock fallback: a fabricated score would mislead the candidate.
 *
 * GEMINI_MOCK=true returns deterministic output for every function (dev/tests).
 */

import Joi from 'joi';
import { SchemaType } from '@google/generative-ai';
import config from '../../config/env.js';
import {
    isMockMode,
    assertConfigured,
    hasValidKey,
    generateJson,
    withRetry,
} from '../../services/llm/gemini.client.js';

export const QUESTION_COUNT = 8;
export const QUESTION_TYPES = ['technical', 'project', 'behavioral'];

/** Hard cap for a live turn; past this we fall back to the planned question */
const TURN_TIMEOUT_MS = 5000;
/** How many recent messages the turn prompt sees (keeps the prompt small → fast) */
const TURN_HISTORY_MESSAGES = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Keep at most `max` sentences — enforces the "max 2 sentences" rule server-side */
const clampSentences = (text, max) => {
    const sentences = String(text || '').trim().match(/[^.!?]+[.!?]*/g) || [];
    return sentences.slice(0, max).join('').trim();
};

const wordCount = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

const formatHistory = (messages) =>
    messages.map((m) => `${m.role === 'ai' ? 'INTERVIEWER' : 'CANDIDATE'}: ${m.text}`).join('\n');

// ── 1. Question generation ────────────────────────────────────────────────────

const QUESTIONS_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        questions: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    type: { type: SchemaType.STRING, format: 'enum', enum: QUESTION_TYPES },
                    question: { type: SchemaType.STRING },
                },
                required: ['type', 'question'],
            },
        },
    },
    required: ['questions'],
};

const QUESTIONS_JOI = Joi.object({
    questions: Joi.array()
        .items(
            Joi.object({
                type: Joi.string().valid(...QUESTION_TYPES).required(),
                question: Joi.string().trim().min(10).max(400).required(),
            })
        )
        .min(QUESTION_COUNT)
        .required(),
});

const buildQuestionsPrompt = (resumeContext, targetRole) => `
You are an experienced interviewer preparing a spoken mock interview for the role: ${targetRole}.
Write exactly ${QUESTION_COUNT} questions tailored to the candidate below, in the order they should be asked:
- 3 "technical" questions on the candidate's strongest listed skills, pitched at their seniority
- 3 "project" questions that dig into specific projects or roles named in the resume
- 2 "behavioral" questions (teamwork, ownership, conflict, learning from failure)
Start with an easy warm-up, interleave the types, and end with a behavioral question.
Each question will be read aloud: max 2 short sentences, no lists, no code, no markdown.

CANDIDATE (JSON):
${JSON.stringify(resumeContext)}`.trim();

const mockQuestions = (ctx) => {
    const skills = ctx.skills?.length ? ctx.skills : ['JavaScript', 'APIs', 'databases'];
    const projects = ctx.projects?.map((p) => p.name).filter(Boolean) || [];
    const roles = ctx.experience?.map((e) => e.title && e.company && `${e.title} at ${e.company}`).filter(Boolean) || [];
    const projectRefs = [...projects, ...roles, 'a recent project', 'your most complex feature'];

    return [
        { type: 'technical', question: `To warm up, how have you used ${skills[0]} in your recent work?` },
        { type: 'project', question: `Walk me through ${projectRefs[0]} and the part you owned end to end.` },
        { type: 'technical', question: `What trade-offs do you consider when choosing ${skills[1] || skills[0]} for a feature?` },
        { type: 'project', question: `What was the hardest technical problem in ${projectRefs[1]}, and how did you solve it?` },
        { type: 'technical', question: `How would you debug a slow request in a system built with ${skills[2] || skills[0]}?` },
        { type: 'behavioral', question: 'Tell me about a time you disagreed with a teammate and how you resolved it.' },
        { type: 'project', question: `If you rebuilt ${projectRefs[2]} today, what would you change and why?` },
        { type: 'behavioral', question: 'Describe a mistake you made at work and what you learned from it.' },
    ];
};

/**
 * @param {Object} resumeContext - compact, PII-free resume summary (see interview.service.js)
 * @param {string} targetRole
 * @returns {Promise<Array<{ id: number, type: string, text: string }>>}
 * @throws ApiError 503 (no key) / 502 (all attempts failed)
 */
const generateQuestions = async (resumeContext, targetRole) => {
    const toPlan = (items) =>
        items.slice(0, QUESTION_COUNT).map((q, i) => ({ id: i + 1, type: q.type, text: q.question }));

    if (isMockMode()) return toPlan(mockQuestions(resumeContext));
    assertConfigured();

    return withRetry(
        async () => {
            const raw = await generateJson({
                prompt: buildQuestionsPrompt(resumeContext, targetRole),
                schema: QUESTIONS_SCHEMA,
                temperature: 0.7, // some variety between interviews
            });

            const { error, value } = QUESTIONS_JOI.validate(raw, { stripUnknown: true });
            if (error) throw new Error(`question schema validation failed: ${error.message}`);

            const plan = toPlan(value.questions);
            const missing = QUESTION_TYPES.filter((t) => !plan.some((q) => q.type === t));
            if (missing.length) throw new Error(`question mix is missing: ${missing.join(', ')}`);
            return plan;
        },
        { label: 'question generation' }
    );
};

// ── 2. Live turn (follow-up or move on) ───────────────────────────────────────

const TURN_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        action: { type: SchemaType.STRING, format: 'enum', enum: ['follow_up', 'next'] },
        followUp: { type: SchemaType.STRING },
        acknowledgement: { type: SchemaType.STRING },
    },
    required: ['action'],
};

const buildTurnPrompt = ({ resumeContext, targetRole, history, currentQuestion, allowFollowUp }) => `
You are a friendly, concise interviewer running a live VOICE mock interview for: ${targetRole}.
Candidate background: skills ${JSON.stringify(resumeContext.skills?.slice(0, 15) || [])}, seniority "${resumeContext.seniorityLevel || 'unknown'}".
Current planned question: "${currentQuestion.text}"

Recent conversation:
${formatHistory(history)}

Decide what to say next about the candidate's LAST answer:
${allowFollowUp
        ? '- action "follow_up" ONLY if the answer was vague, very short or skipped something important; put ONE probing question in "followUp" (max 2 short sentences).\n- otherwise action "next".'
        : '- a follow-up was already asked for this question, so action MUST be "next".'}
- For "next", put a brief natural acknowledgement in "acknowledgement" (max 1 short sentence, no question, no praise inflation).
Spoken output only: no markdown, no lists, no emojis.`.trim();

/**
 * Decide the interviewer's next utterance. Never throws.
 *
 * @param {Object} p
 * @param {Object} p.resumeContext
 * @param {string} p.targetRole
 * @param {Array}  p.history          - transcript messages incl. the latest user answer
 * @param {Object} p.currentQuestion  - planned question being discussed
 * @param {boolean} p.allowFollowUp
 * @returns {Promise<{ action: 'follow_up'|'next', text: string, source: 'llm'|'fallback'|'mock', error?: string }>}
 *          `text` is the follow-up question or the acknowledgement (may be '').
 */
const nextTurn = async ({ resumeContext, targetRole, history, currentQuestion, allowFollowUp }) => {
    const lastAnswer = [...history].reverse().find((m) => m.role === 'user')?.text || '';

    if (isMockMode()) {
        // Deterministic: probe short answers once, otherwise move on
        if (allowFollowUp && wordCount(lastAnswer) < 12) {
            return { action: 'follow_up', text: 'Could you go a bit deeper on that with a concrete example?', source: 'mock' };
        }
        return { action: 'next', text: 'Thanks, that helps.', source: 'mock' };
    }

    const fallback = (reason) => ({ action: 'next', text: '', source: 'fallback', error: reason });
    if (!hasValidKey()) return fallback('GEMINI_API_KEY not configured');

    try {
        const raw = await generateJson({
            prompt: buildTurnPrompt({
                resumeContext,
                targetRole,
                history: history.slice(-TURN_HISTORY_MESSAGES),
                currentQuestion,
                allowFollowUp,
            }),
            schema: TURN_SCHEMA,
            model: config.geminiFastModel,
            temperature: 0.4,
            maxOutputTokens: 150, // ~2 sentences; small budget = faster generation
            timeoutMs: TURN_TIMEOUT_MS,
        });

        const followUp = clampSentences(raw.followUp, 2);
        if (raw.action === 'follow_up' && allowFollowUp && followUp) {
            return { action: 'follow_up', text: followUp, source: 'llm' };
        }
        return { action: 'next', text: clampSentences(raw.acknowledgement, 1), source: 'llm' };
    } catch (err) {
        console.warn(`⚠️  Gemini interview turn failed — moving to the planned question: ${err.message}`);
        return fallback(err.message);
    }
};

// ── 3. Final evaluation ───────────────────────────────────────────────────────

const REPORT_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        score: { type: SchemaType.INTEGER },
        summary: { type: SchemaType.STRING },
        strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        skillGaps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        skillBreakdown: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    skill: { type: SchemaType.STRING },
                    score: { type: SchemaType.INTEGER },
                },
                required: ['skill', 'score'],
            },
        },
    },
    required: ['score', 'summary', 'strengths', 'weaknesses', 'skillGaps', 'skillBreakdown'],
};

const shortList = Joi.array().items(Joi.string().trim().min(1).max(200).truncate()).max(10);

const REPORT_JOI = Joi.object({
    score: Joi.number().integer().min(0).max(100).required(),
    summary: Joi.string().trim().max(2000).truncate().allow('').default(''),
    strengths: shortList.default([]),
    weaknesses: shortList.default([]),
    // Skill names only — the courses module matches these against course tags
    skillGaps: Joi.array().items(Joi.string().trim().min(1).max(60).truncate()).max(10).default([]),
    skillBreakdown: Joi.array()
        .items(Joi.object({ skill: Joi.string().trim().max(60).truncate().required(), score: Joi.number().integer().min(0).max(100).required() }))
        .max(12)
        .default([]),
});

const buildReportPrompt = ({ resumeContext, targetRole, questions, transcript }) => `
You are a senior interviewer writing an honest evaluation of a mock interview for: ${targetRole}.

Candidate resume summary (JSON): ${JSON.stringify(resumeContext)}
Planned questions (JSON): ${JSON.stringify(questions.map((q) => ({ type: q.type, text: q.text })))}

Full transcript:
${formatHistory(transcript)}

Score ONLY what the candidate actually said. Unanswered questions count against the score.
- score: integer 0-100 (50 = borderline for the role, 80+ = strong hire signal)
- summary: 2-3 sentences
- strengths / weaknesses: 2-5 short, specific bullet phrases each, grounded in the transcript
- skillGaps: 1-6 concrete skill or topic NAMES to study (e.g. "System Design", "SQL indexing"), no sentences
- skillBreakdown: 3-8 skills discussed, each with an integer 0-100 score`.trim();

const mockReport = ({ resumeContext, transcript }) => {
    const answers = transcript.filter((m) => m.role === 'user');
    const avgWords = answers.reduce((n, m) => n + wordCount(m.text), 0) / Math.max(answers.length, 1);
    const score = Math.max(20, Math.min(95, Math.round(40 + avgWords) + answers.length * 2));
    const skills = resumeContext.skills?.length ? resumeContext.skills : ['Communication'];

    return {
        score,
        summary: `Mock evaluation (GEMINI_MOCK=true) of ${answers.length} answer(s), averaging ${Math.round(avgWords)} words each.`,
        strengths: ['Clear communication', `Hands-on experience with ${skills[0]}`],
        weaknesses: ['Answers could include more measurable impact'],
        skillGaps: ['System Design', 'Testing'],
        skillBreakdown: skills.slice(0, 4).map((skill, i) => ({ skill, score: Math.max(40, score - i * 5) })),
    };
};

/**
 * @returns {Promise<{ score, summary, strengths, weaknesses, skillGaps, skillBreakdown }>}
 * @throws ApiError 503 (no key) / 502 (all attempts failed)
 */
const generateReport = async ({ resumeContext, targetRole, questions, transcript }) => {
    if (isMockMode()) return mockReport({ resumeContext, transcript });
    assertConfigured();

    return withRetry(
        async () => {
            const raw = await generateJson({
                prompt: buildReportPrompt({ resumeContext, targetRole, questions, transcript }),
                schema: REPORT_SCHEMA,
                temperature: 0.2,
            });
            const { error, value } = REPORT_JOI.validate(raw, { stripUnknown: true });
            if (error) throw new Error(`report schema validation failed: ${error.message}`);
            return value;
        },
        { label: 'interview evaluation' }
    );
};

export default { generateQuestions, nextTurn, generateReport };
export { clampSentences };
