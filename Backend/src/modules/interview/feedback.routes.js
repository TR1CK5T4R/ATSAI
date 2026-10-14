/**
 * feedback.routes.js — Reviewer feedback (recruiter/admin only)
 *
 *   POST /api/feedback/add                       { interviewId, rating, comments? }
 *   GET  /api/feedback/interview/:interviewId    all reviewer feedback for an interview
 */

import express from 'express';
import feedbackController from './feedback.controller.js';
import validation from './feedback.validation.js';
import { validate } from '../../middleware/validate.middleware.js';
import { protect, authorizeRoles } from '../../middleware/auth.middleware.js';

const router = express.Router();
const staffOnly = [protect, authorizeRoles('recruiter', 'admin')];

router.post('/add', ...staffOnly, validate(validation.addFeedback), feedbackController.addFeedback);
router.get('/interview/:interviewId', ...staffOnly, validate(validation.listForInterview), feedbackController.listForInterview);

export default router;
