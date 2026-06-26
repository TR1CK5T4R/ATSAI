import catchAsync from '../../utils/catchAsync.js';
import resumeService from './resume.service.js';
import ApiError from '../../utils/ApiError.js';

const uploadResume = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'Please upload a PDF file');
    }

    const result = await resumeService.processAndSaveResume(req.user.id, req.file);

    res.status(201).json({
        success: true,
        message: 'Resume analyzed successfully',
        data: result
    });
});

const getMyResumes = catchAsync(async (req, res) => {
    const resumes = await resumeService.getUserResumes(req.user.id);
    res.status(200).json({
        success: true,
        count: resumes.length,
        data: resumes
    });
});

export default {
    uploadResume,
    getMyResumes
};
