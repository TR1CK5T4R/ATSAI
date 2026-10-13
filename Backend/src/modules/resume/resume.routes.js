/**
 * resume.routes.js — REST endpoints for the resume module
 *
 *   POST /api/resume/upload       multipart/form-data (field: "resume") → parse + persist
 *   GET  /api/resume/my           list the current user's resumes
 *   GET  /api/resume/score/latest heuristic resume-strength score
 *   GET  /api/resume/:id          single resume by UUID (owner or staff)
 */

import express from 'express';
import resumeUpload from './resume.upload.js';
import resumeController from './resume.controller.js';
import validation from './resume.validation.js';
import { validate } from '../../middleware/validate.middleware.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

// ── Upload (multipart) ────────────────────────────────────────────────────────
// Order matters: authenticate → multer (size/type gates) → controller pipeline
router.post('/upload', protect, resumeUpload, resumeController.uploadResume);

// ── List / score reads ────────────────────────────────────────────────────────
// NOTE: declared BEFORE /:id so the UUID parameter route cannot shadow them
router.get('/my', protect, resumeController.getMyResumes);
router.get('/score/latest', protect, resumeController.getLatestScore);

// ── Single resume by id ───────────────────────────────────────────────────────
router.get('/:id', protect, validate(validation.getResume), resumeController.getResumeById);

export default router;
