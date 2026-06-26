import catchAsync from '../../utils/catchAsync.js';
import interviewService from './interview.service.js';
import ApiError from '../../utils/ApiError.js';

const startInterview = catchAsync(async (req, res) => {
    const { roleApplied } = req.body;
    if (!roleApplied) throw new ApiError(400, 'Role applied is required');

    const result = await interviewService.startInterview(req.user.id, roleApplied);
    res.status(201).json({ success: true, data: result });
});

const submitAnswer = catchAsync(async (req, res) => {
    const { sessionId, answer } = req.body;
    if (!sessionId || !answer) throw new ApiError(400, 'Session ID and answer are required');

    const result = await interviewService.processAnswer(sessionId, req.user.id, answer);
    res.status(200).json({ success: true, data: result });
});

const completeInterview = catchAsync(async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) throw new ApiError(400, 'Session ID is required');

    const result = await interviewService.completeInterview(sessionId, req.user.id);
    res.status(200).json({ success: true, data: result });
});

const getInterview = catchAsync(async (req, res) => {
    const { sessionId } = req.params;
    const result = await interviewService.getInterviewSession(sessionId, req.user.id);
    res.status(200).json({ success: true, data: result });
});

export default {
    startInterview,
    submitAnswer,
    completeInterview,
    getInterview
};
