/**
 * feedback.controller.js — HTTP handlers for reviewer feedback
 */

import catchAsync from '../../utils/catchAsync.js';
import feedbackService from './feedback.service.js';

/** POST /api/feedback/add { interviewId, rating 1-5, comments? } → 201 created / 200 updated */
const addFeedback = catchAsync(async (req, res) => {
    const { feedback, created } = await feedbackService.addFeedback(req.user, req.body);
    res.status(created ? 201 : 200).json({ success: true, data: feedback });
});

/** GET /api/feedback/interview/:interviewId */
const listForInterview = catchAsync(async (req, res) => {
    const data = await feedbackService.listForInterview(req.params.interviewId);
    res.status(200).json({ success: true, data });
});

export default { addFeedback, listForInterview };
