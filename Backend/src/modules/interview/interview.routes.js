import express from 'express';
import interviewController from './interview.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.post('/start', protect, interviewController.startInterview);
router.post('/answer', protect, interviewController.submitAnswer);
router.post('/complete', protect, interviewController.completeInterview);
router.get('/:sessionId', protect, interviewController.getInterview);

export default router;
