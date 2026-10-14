/**
 * interview.routes.js — REST endpoints for the interview module (all require login)
 *
 *   POST /api/interview/create        { resumeId, targetRole? } → 8 planned questions, returns question 1
 *   POST /api/interview/:id/answer    { text } → follow-up or next question (+ latencyMs)
 *   POST /api/interview/:id/finish    → score, strengths, weaknesses, skillGaps (saved to PG)
 *   GET  /api/interview/history       → caller's interviews (staff: all, ?userId= filter)
 *   GET  /api/interview/:id           → interview + transcript (owner or staff)
 */

import express from 'express';
import interviewController from './interview.controller.js';
import validation from './interview.validation.js';
import { validate } from '../../middleware/validate.middleware.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/create', protect, validate(validation.createInterview), interviewController.createInterview);

// Declared BEFORE /:id so "history" is not captured as an id
router.get('/history', protect, validate(validation.history), interviewController.getHistory);

router.post('/:id/answer', protect, validate(validation.submitAnswer), interviewController.submitAnswer);
router.post('/:id/finish', protect, validate(validation.byId), interviewController.finishInterview);
router.get('/:id', protect, validate(validation.byId), interviewController.getInterview);

export default router;
