/**
 * interview.service.js — Interview lifecycle
 *
 *   create  → load the resume, generate 8 planned questions (PG) and open the
 *             transcript with question 1 (Mongo)
 *   answer  → save the user turn, ask Gemini (fast model) for a follow-up or
 *             move to the next planned question, save the AI turn + latencyMs
 *   finish  → evaluate the whole transcript and save score, strengths,
 *             weaknesses and skillGaps on the interview row (PG)
 *   get / history
 *
 * Access rules: candidates can only touch their own interviews; recruiters and
 * admins can read any interview but never answer or finish one.
 *
 * Planned-question state (currentQuestionIndex) lives in PG; turn-by-turn
 * messages live in Mongo and are appended with atomic $push.
 */

import mongoose from 'mongoose';
import Interview from './interview.model.pg.js';
import InterviewChat from './InterviewChat.model.mongo.js';
import Resume from '../resume/resume.model.pg.js';
import ai, { QUESTION_COUNT } from './interview.ai.js';
import ApiError from '../../utils/ApiError.js';

/** Follow-ups allowed per planned question — bounds the interview length */
const MAX_FOLLOW_UPS_PER_QUESTION = 1;
const CLOSING_LINE = "That was the last question, thank you for your time. Finish the interview whenever you're ready to see your report.";

const STAFF_ROLES = new Set(['recruiter', 'admin']);
const isStaff = (user) => STAFF_ROLES.has(user.role);

// ── Guards ────────────────────────────────────────────────────────────────────

/** Transcripts live in Mongo — fail clearly instead of losing turns */
const assertMongoReady = () => {
    if (mongoose.connection.readyState !== 1) {
        throw new ApiError(503, 'Interview transcripts are unavailable (MongoDB not connected) — check MONGO_URI');
    }
};

/**
 * Load an interview and enforce access.
 * @param {'read'|'write'} mode - read: owner or staff · write: owner only
 */
const loadInterview = async (user, id, mode) => {
    const interview = await Interview.findByPk(id);
    if (!interview) throw new ApiError(404, 'Interview not found');

    const isOwner = String(interview.userId) === String(user.id);
    if (mode === 'write' && !isOwner) {
        throw new ApiError(403, 'Only the candidate who owns this interview can do that');
    }
    if (mode === 'read' && !isOwner && !isStaff(user)) {
        throw new ApiError(403, 'You are not allowed to view this interview');
    }
    return interview;
};

/**
 * One request at a time per interview (double-submits from the voice UI would
 * otherwise advance the question index twice). In-process — fine for a single
 * Node instance; swap for a Redis lock if the API is scaled horizontally.
 */
const activeInterviews = new Set();
const withInterviewLock = async (id, fn) => {
    if (activeInterviews.has(id)) {
        throw new ApiError(409, 'The previous request for this interview is still being processed');
    }
    activeInterviews.add(id);
    try {
        return await fn();
    } finally {
        activeInterviews.delete(id);
    }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compact, PII-free view of a parsed resume for prompts
 * (no name/email/phone; long descriptions trimmed to keep prompts fast).
 */
const buildResumeContext = (parsed = {}) => ({
    seniorityLevel: parsed.seniorityLevel || '',
    experienceYears: parsed.experienceYears ?? 0,
    skills: (parsed.skills || []).slice(0, 25),
    experience: (parsed.experience || []).slice(0, 5).map((e) => ({
        title: e.title,
        company: e.company,
        description: (e.description || '').slice(0, 300),
    })),
    projects: (parsed.projects || []).slice(0, 5).map((p) => ({
        name: p.name,
        description: (p.description || '').slice(0, 300),
        technologies: p.technologies || [],
    })),
    education: (parsed.education || []).slice(0, 2).map((e) => ({ degree: e.degree })),
});

const deriveTargetRole = (parsed = {}) =>
    [parsed.seniorityLevel, parsed.experience?.[0]?.title].filter(Boolean).join(' ').trim() || 'Software Engineer';

const loadResumeContext = async (interview) => {
    const resume = interview.resumeId ? await Resume.findByPk(interview.resumeId) : null;
    return buildResumeContext(resume?.parsedJson);
};

const toTranscript = (messages = []) =>
    messages.map((m) => ({
        role: m.role,
        text: m.text,
        kind: m.kind,
        questionIndex: m.questionIndex,
        latencyMs: m.latencyMs,
        source: m.source,
        timestamp: m.timestamp,
    }));

const toReport = (interview) => ({
    interviewId: interview.id,
    status: interview.status,
    score: interview.score,
    summary: interview.feedbackSummary,
    strengths: interview.strengths || [],
    weaknesses: interview.weaknesses || [],
    skillGaps: interview.skillGaps || [],
    skillBreakdown: interview.skillBreakdown || [],
    completedAt: interview.completedAt,
});

// ── POST /interview/create ────────────────────────────────────────────────────

const createInterview = async (user, { resumeId, targetRole }) => {
    assertMongoReady();

    const resume = await Resume.findByPk(resumeId);
    if (!resume) throw new ApiError(404, 'Resume not found');
    if (String(resume.userId) !== String(user.id)) {
        throw new ApiError(403, 'You can only start an interview from your own resume');
    }
    if (!resume.parsedJson || !Object.keys(resume.parsedJson).length) {
        throw new ApiError(422, 'This resume has no parsed data yet — upload it again');
    }

    const role = targetRole || deriveTargetRole(resume.parsedJson);
    const context = buildResumeContext(resume.parsedJson);

    const startedAt = Date.now();
    const questions = await ai.generateQuestions(context, role);
    const generationMs = Date.now() - startedAt;

    const interview = await Interview.create({
        userId: user.id,
        resumeId: resume.id,
        targetRole: role,
        status: 'ongoing',
        questions,
        currentQuestionIndex: 0,
    });

    try {
        await InterviewChat.create({
            interviewId: interview.id,
            userId: String(user.id),
            messages: [{ role: 'ai', kind: 'question', questionIndex: 0, text: questions[0].text, source: 'plan' }],
        });
    } catch (err) {
        // Don't leave a PG interview without a transcript
        await interview.destroy().catch(() => {});
        throw err;
    }

    console.log(`🎙️  Interview ${interview.id} created (${questions.length} questions in ${generationMs} ms)`);

    return {
        id: interview.id,
        targetRole: role,
        status: interview.status,
        totalQuestions: questions.length,
        questionNumber: 1,
        question: { type: questions[0].type, text: questions[0].text },
        generationMs,
    };
};

// ── POST /interview/:id/answer ────────────────────────────────────────────────

const submitAnswer = async (user, id, text) =>
    withInterviewLock(id, async () => {
        assertMongoReady();
        const interview = await loadInterview(user, id, 'write');
        if (interview.status !== 'ongoing') {
            throw new ApiError(409, 'This interview is already finished');
        }

        const { questions } = interview;
        const index = interview.currentQuestionIndex;
        if (index >= questions.length) {
            throw new ApiError(409, 'All questions are answered — call /finish to get your report');
        }

        const chat = await InterviewChat.findOne({ interviewId: id }).lean();
        if (!chat) throw new ApiError(404, 'Interview transcript not found');

        // 1. Persist the user turn first, so it is never lost even if the AI step fails
        const userTurn = { role: 'user', text, questionIndex: index, timestamp: new Date() };
        await InterviewChat.updateOne({ interviewId: id }, { $push: { messages: userTurn } });

        // 2. Ask Gemini (fast model) for a follow-up or a hand-off to the next question
        const followUpsAsked = chat.messages.filter(
            (m) => m.role === 'ai' && m.kind === 'follow_up' && m.questionIndex === index
        ).length;
        const llmStartedAt = Date.now();
        const turn = await ai.nextTurn({
            resumeContext: await loadResumeContext(interview),
            targetRole: interview.targetRole,
            history: [...chat.messages, userTurn],
            currentQuestion: questions[index],
            allowFollowUp: followUpsAsked < MAX_FOLLOW_UPS_PER_QUESTION,
        });
        const latencyMs = Date.now() - llmStartedAt;

        // 3. Turn the decision into the AI's spoken reply
        let aiTurn;
        let nextIndex = index;
        if (turn.action === 'follow_up') {
            aiTurn = { kind: 'follow_up', questionIndex: index, text: turn.text };
        } else {
            nextIndex = index + 1;
            const nextQuestion = questions[nextIndex];
            aiTurn = nextQuestion
                ? { kind: 'question', questionIndex: nextIndex, text: [turn.text, nextQuestion.text].filter(Boolean).join(' ') }
                : { kind: 'closing', questionIndex: index, text: CLOSING_LINE };
        }

        // 4. Persist the AI turn (with latency) and advance the plan
        await InterviewChat.updateOne(
            { interviewId: id },
            { $push: { messages: { role: 'ai', ...aiTurn, latencyMs, source: turn.source, timestamp: new Date() } } }
        );
        if (nextIndex !== index) {
            await interview.update({ currentQuestionIndex: nextIndex });
        }

        console.log(`⏱️  Interview ${id} turn: ${latencyMs} ms (${turn.source}, ${aiTurn.kind})`);

        const done = aiTurn.kind === 'closing';
        return {
            reply: aiTurn.text,
            kind: aiTurn.kind,
            questionNumber: Math.min(nextIndex, questions.length - 1) + 1,
            totalQuestions: questions.length,
            done,
            latencyMs,
        };
    });

// ── POST /interview/:id/finish ────────────────────────────────────────────────

const finishInterview = async (user, id) =>
    withInterviewLock(id, async () => {
        const interview = await loadInterview(user, id, 'write');

        // Idempotent: finishing twice returns the stored report without a new LLM call
        if (interview.status === 'completed') return toReport(interview);

        assertMongoReady();
        const chat = await InterviewChat.findOne({ interviewId: id }).lean();
        const transcript = chat?.messages || [];
        if (!transcript.some((m) => m.role === 'user')) {
            throw new ApiError(400, 'Answer at least one question before finishing the interview');
        }

        // Throws 502 after retries — the interview stays 'ongoing' so the user can retry finish
        const report = await ai.generateReport({
            resumeContext: await loadResumeContext(interview),
            targetRole: interview.targetRole,
            questions: interview.questions,
            transcript,
        });

        await interview.update({
            status: 'completed',
            score: report.score,
            feedbackSummary: report.summary,
            strengths: report.strengths,
            weaknesses: report.weaknesses,
            skillGaps: report.skillGaps,
            skillBreakdown: report.skillBreakdown,
            completedAt: new Date(),
        });

        return toReport(interview);
    });

// ── GET /interview/:id ────────────────────────────────────────────────────────

const getInterview = async (user, id) => {
    const interview = await loadInterview(user, id, 'read');
    assertMongoReady();
    const chat = await InterviewChat.findOne({ interviewId: id }).lean();

    const data = interview.toJSON();
    // Candidates don't see upcoming questions while the interview is running
    if (!isStaff(user) && interview.status === 'ongoing') {
        data.questions = interview.questions.slice(0, interview.currentQuestionIndex + 1);
    }

    return {
        interview: data,
        report: interview.status === 'completed' ? toReport(interview) : null,
        transcript: toTranscript(chat?.messages),
    };
};

// ── GET /interview/history ────────────────────────────────────────────────────

const getHistory = async (user, { limit, offset, status, userId }) => {
    if (userId && !isStaff(user) && String(userId) !== String(user.id)) {
        throw new ApiError(403, "You can only view your own interview history");
    }

    const where = {};
    if (!isStaff(user)) where.userId = user.id;      // candidates: always their own
    else if (userId) where.userId = userId;           // staff: optional candidate filter
    if (status) where.status = status;

    const { count, rows } = await Interview.findAndCountAll({
        where,
        attributes: { exclude: ['questions'] },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
    });

    return {
        total: count,
        limit,
        offset,
        items: rows.map((r) => ({ ...r.toJSON(), totalQuestions: QUESTION_COUNT })),
    };
};

export default {
    loadInterview,
    createInterview,
    submitAnswer,
    finishInterview,
    getInterview,
    getHistory,
    buildResumeContext,
};
