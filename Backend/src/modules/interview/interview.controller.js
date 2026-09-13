/**
 * interview.controller.js — HTTP handlers for the interview module
 * Thin layer: input is already Joi-validated by the routes; access rules and
 * business logic live in interview.service.js.
 */

import catchAsync from '../../utils/catchAsync.js';
import interviewService from './interview.service.js';

/** POST /api/interview/create { resumeId, targetRole? } */
const createInterview = catchAsync(async (req, res) => {
    const data = await interviewService.createInterview(req.user, req.body);
    res.status(201).json({ success: true, data });
});

/** POST /api/interview/:id/answer { text } */
const submitAnswer = catchAsync(async (req, res) => {
    const data = await interviewService.submitAnswer(req.user, req.params.id, req.body.text);
    res.status(200).json({ success: true, data });
});

/** POST /api/interview/:id/finish */
const finishInterview = catchAsync(async (req, res) => {
    const data = await interviewService.finishInterview(req.user, req.params.id);
    res.status(200).json({ success: true, data });
});

/** GET /api/interview/:id */
const getInterview = catchAsync(async (req, res) => {
    const data = await interviewService.getInterview(req.user, req.params.id);
    res.status(200).json({ success: true, data });
});

/** GET /api/interview/history?limit&offset&status&userId */
const getHistory = catchAsync(async (req, res) => {
    const data = await interviewService.getHistory(req.user, req.query);
    res.status(200).json({ success: true, data });
});

export default {
    createInterview,
    submitAnswer,
    finishInterview,
    getInterview,
    getHistory,
};
