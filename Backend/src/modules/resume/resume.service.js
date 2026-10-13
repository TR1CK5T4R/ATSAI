/**
 * resume.service.js — Resume pipeline orchestration
 *
 *   upload → storage.saveFile → extractResumeText → parseResumeWithGemini
 *          → Resume.create (PostgreSQL, parsedJson) → ResumeAnalysis (Mongo, raw text)
 *
 * Failure semantics:
 *   - If any step after saveFile fails, the stored file is deleted (no orphans)
 *     and the original error propagates (e.g. ApiError 502 from the AI layer).
 *   - The MongoDB mirror is best-effort only — the module works without Mongo.
 */

import mongoose from 'mongoose';
import Resume from './resume.model.pg.js';
import ResumeAnalysis from './resume.model.mongo.js';
import storage from '../../services/storage/index.js';
import { extractResumeText } from './resume.parser.js';
import { parseResumeWithGemini } from './resume.ai.js';
import ApiError from '../../utils/ApiError.js';

/**
 * Process and store an uploaded resume (POST /api/resume/upload).
 * @param {string} userId - owner (req.user.id from auth middleware)
 * @param {import('multer').File} file - multer file object (buffer in memory)
 */
const processAndSaveResume = async (userId, file) => {
    // 1. Persist the original file through the storage abstraction
    //    (local disk today; S3/Cloudinary via STORAGE_DRIVER later — same call)
    const saved = await storage.saveFile({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
    });

    try {
        // 2. Extract plain text (pdf-parse for PDF / mammoth for DOCX)
        const { text, kind, truncated } = await extractResumeText(file);

        // 3. Gemini → strict JSON (native responseSchema + Joi re-validation
        //    + 3 attempts with exponential backoff — all inside resume.ai.js)
        const parsed = await parseResumeWithGemini(text);

        // 4. Persist the structured result in PostgreSQL
        const resume = await Resume.create({
            userId,
            fileUrl: saved.publicUrl,
            parsedJson: parsed,
            skills: parsed.skills,
            experienceYears: parsed.experienceYears,
        });

        // 5. Mirror raw text + AI output to MongoDB (analytics / retraining logs).
        //    Skipped when Mongo is not connected (e.g. unit tests) — never fatal.
        let mongoId = null;
        if (mongoose.connection.readyState === 1) {
            try {
                const analysis = await ResumeAnalysis.create({
                    userId,
                    rawText: text,
                    aiStructuredData: parsed,
                    aiSuggestions: [],
                });
                mongoId = String(analysis._id);
            } catch (err) {
                console.warn('⚠️  MongoDB resume mirror failed (non-fatal):', err.message);
            }
        }

        if (truncated) {
            console.warn(`ℹ️  Resume ${resume.id} was truncated before AI parsing (text too long)`);
        }

        return {
            id: resume.id,
            fileUrl: resume.fileUrl,
            structured: resume.parsedJson,
            mongoId,
        };
    } catch (err) {
        // Pipeline failed after the file was stored — clean up the orphan
        await storage.deleteFile(saved.key).catch((e) =>
            console.warn('⚠️  Orphan upload cleanup failed:', e.message)
        );
        throw err;
    }
};

/**
 * GET /api/resume/:id — fetch one resume row (ownership checked in controller).
 * @param {string} id - Resume UUID
 * @throws ApiError 404 when the id does not exist
 */
const getResumeById = async (id) => {
    const resume = await Resume.findByPk(id);
    if (!resume) {
        throw new ApiError(404, 'Resume not found');
    }
    return resume;
};

/**
 * GET /api/resume/my — newest-first list of the user's resumes.
 * @param {string} userId
 */
const getUserResumes = async (userId) => {
    return Resume.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
    });
};

/**
 * Lightweight, deterministic "resume strength" score (0–100).
 * Deliberately heuristic (not AI) so this endpoint stays instant and free —
 * the interview module owns the real AI-based scoring.
 *   name/email 10+10 · skills ≤25 (3/skill) · experience ≤20 (7/entry)
 *   education ≤15 (8/entry) · projects ≤20 (7/entry)
 */
const computeResumeScore = (parsed = {}) => {
    let score = 0;
    if (parsed.name) score += 10;
    if (parsed.email) score += 10;
    if (Array.isArray(parsed.skills)) score += Math.min(25, parsed.skills.length * 3);
    if (Array.isArray(parsed.experience)) score += Math.min(20, parsed.experience.length * 7);
    if (Array.isArray(parsed.education)) score += Math.min(15, parsed.education.length * 8);
    if (Array.isArray(parsed.projects)) score += Math.min(20, parsed.projects.length * 7);
    return Math.min(100, score);
};

/**
 * GET /api/resume/score/latest — score of the user's most recent resume (0 if none).
 * @param {string} userId
 */
const getLatestResumeScore = async (userId) => {
    const resume = await Resume.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']],
    });
    return resume ? computeResumeScore(resume.parsedJson) : 0;
};

export default {
    processAndSaveResume,
    getResumeById,
    getUserResumes,
    getLatestResumeScore,
};

