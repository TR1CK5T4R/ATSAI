/**
 * resume.controller.js — HTTP handlers for the resume module
 * All handlers are wrapped in catchAsync so rejected promises flow into the
 * global error handler (src/middleware/error.middleware.js).
 */

import catchAsync from '../../utils/catchAsync.js';
import resumeService from './resume.service.js';
import ApiError from '../../utils/ApiError.js';

/**
 * POST /api/resume/upload  (multipart/form-data, field: "resume")
 * Multer has already validated presence/size/type; here we run the pipeline:
 * save file → extract text → Gemini parse → persist (PG + Mongo mirror).
 */
const uploadResume = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'Please attach a resume file (PDF or DOCX) in the "resume" field');
    }

    const result = await resumeService.processAndSaveResume(req.user.id, req.file);

    res.status(201).json({
        success: true,
        message: 'Resume analyzed successfully',
        data: result,
    });
});

/**
 * GET /api/resume/:id
 * Candidates may only read their own resumes; recruiters/admins may read any.
 */
const getResumeById = catchAsync(async (req, res) => {
    const resume = await resumeService.getResumeById(req.params.id);

    const isOwner = String(resume.userId) === String(req.user.id);
    const isStaff = req.user.role === 'recruiter' || req.user.role === 'admin';
    if (!isOwner && !isStaff) {
        throw new ApiError(403, 'You are not allowed to view this resume');
    }

    res.status(200).json({
        success: true,
        data: resume,
    });
});

/**
 * GET /api/resume/my — list the current user's resumes (newest first).
 */
const getMyResumes = catchAsync(async (req, res) => {
    const resumes = await resumeService.getUserResumes(req.user.id);

    res.status(200).json({
        success: true,
        count: resumes.length,
        data: resumes,
    });
});

/**
 * GET /api/resume/score/latest — heuristic resume-strength score (0–100).
 */
const getLatestScore = catchAsync(async (req, res) => {
    const score = await resumeService.getLatestResumeScore(req.user.id);

    res.status(200).json({
        success: true,
        score,
    });
});

export default {
    uploadResume,
    getResumeById,
    getMyResumes,
    getLatestScore,
};
