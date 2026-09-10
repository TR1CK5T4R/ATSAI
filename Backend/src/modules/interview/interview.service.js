import Interview from './Interview.model.pg.js';
import InterviewLog from './InterviewChat.model.mongo.js';
import Resume from '../resume/Resume.model.pg.js';
import ai from './interview.ai.js';
import ApiError from '../../utils/ApiError.js';

// In-memory fallback for when MongoDB is unavailable
const memoryLogs = new Map();

const safeCreateLog = async (data) => {
    try {
        // Try creating in MongoDB
        const log = await InterviewLog.create(data);
        return log;
    } catch (error) {
        console.warn('⚠️ MongoDB unavailable. Using in-memory log for session', data.sessionId);
        const logData = { 
            ...data, 
            save: async function() {
                memoryLogs.set(this.sessionId, this);
            }
        };
        memoryLogs.set(data.sessionId, logData);
        return logData;
    }
};

const safeGetLog = async (sessionId) => {
    try {
        const log = await InterviewLog.findOne({ sessionId });
        if (log) return log;
        // If not found, maybe it's in memory?
        if (memoryLogs.has(sessionId)) return memoryLogs.get(sessionId);
        return null;
    } catch (error) {
        // MongoDB error, fallback to memory
        if (memoryLogs.has(sessionId)) return memoryLogs.get(sessionId);
        return null;
    }
};

/**
 * Start a new interview session
 */
const startInterview = async (userId, roleApplied) => {
    // 1. Create PG Session
    const session = await Interview.create({
        userId,
        status: 'ongoing',
    });

    // 2. Fetch User Resume (for context)
    const resume = await Resume.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']],
    });

    const resumeData = resume ? {
        skills: resume.skills,
        experienceYears: resume.experienceYears,
        parsedJson: resume.parsedJson,
    } : {};

    // Link resume to interview if found
    if (resume) {
        session.resumeId = resume.id;
        await session.save();
    }

    // 3. Generate First Question
    const aiResponse = await ai.generateFirstQuestion(resumeData, roleApplied);

    // 4. Create Mongo Log (or fallback)
    await safeCreateLog({
        sessionId: session.id,
        userId,
        roleApplied,
        messages: [{
            role: 'ai',
            content: aiResponse.question,
            timestamp: new Date()
        }]
    });

    return {
        sessionId: session.id,
        question: aiResponse.question,
        context: aiResponse.context
    };
};

/**
 * Process user answer and generate next step
 */
const processAnswer = async (sessionId, userId, userAnswer) => {
    // 1. Verify Session
    const session = await Interview.findOne({ where: { id: sessionId, userId } });
    if (!session || session.status === 'completed') {
        throw new ApiError(400, 'Invalid or completed session');
    }

    // 2. Get Chat History from Mongo (or fallback)
    const log = await safeGetLog(sessionId);
    if (!log) throw new ApiError(404, 'Interview log not found');

    const lastAiMessage = log.messages.filter(m => m.role === 'ai').pop();
    const currentQuestion = lastAiMessage ? lastAiMessage.text : "Tell me about yourself.";

    // 3. Evaluate Answer
    const evaluation = await ai.evaluateAnswer(currentQuestion, userAnswer, session.roleApplied);

    // 4. Update Log with User Answer & Evaluation
    log.messages.push({
        role: 'user',
        text: userAnswer,
        timestamp: new Date()
    });

    // 5. Generate Next Question using updated history
    const nextQuestionData = await ai.generateNextQuestion(log.messages);

    log.messages.push({
        role: 'ai',
        text: nextQuestionData.question,
        timestamp: new Date()
    });

    await log.save();

    return {
        nextQuestion: nextQuestionData.question,
        evaluation: {
            score: evaluation.score,
            feedback: evaluation.feedback
        }
    };
};

/**
 * Complete Interview and Generate Report
 */
const completeInterview = async (sessionId, userId) => {
    const session = await Interview.findOne({ where: { id: sessionId, userId } });
    if (!session) throw new ApiError(404, 'Session not found');

    const log = await safeGetLog(sessionId);

    // 1. Generate Final Report
    const report = await ai.generateFinalReport(log?.messages || []);

    // 2. Update PG Session — map to spec fields
    session.status = 'completed';
    session.score = report.finalScore ?? null;
    session.feedbackSummary = report.summary ?? null;
    await session.save();

    // 3. Persist skill breakdown in feedbackSummary (JSON) or Mongo
    // SkillScore table removed in v2 — skill data stored in MongoDB log

    // 4. Update Mongo with Full Feedback
    if (log) {
        log.overallFeedback = report;
        log.skillBreakdown = report.skillBreakdown;
        await log.save();
    }

    return report;
};

/**
 * Get Interview History
 */
const getInterviewSession = async (sessionId, userId) => {
    const session = await Interview.findOne({ where: { id: sessionId, userId } });
    if (!session) throw new ApiError(404, 'Session not found');

    const log = await safeGetLog(sessionId);
    return { session, log };
};

export default {
    startInterview,
    processAnswer,
    completeInterview,
    getInterviewSession
};
