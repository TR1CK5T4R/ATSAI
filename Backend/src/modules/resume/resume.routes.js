import express from 'express';
import multer from 'multer';
import resumeController from './resume.controller.js';
import validation from './resume.validation.js';
import { protect } from '../../middleware/auth.middleware.js';
import ApiError from '../../utils/ApiError.js';

const router = express.Router();

// Multer Setup (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new ApiError(400, 'Only PDF files are allowed'), false);
        }
    },
});

// Routes
router.post(
    '/upload',
    protect,
    upload.single('resume'),
    resumeController.uploadResume
);

router.get('/my', protect, resumeController.getMyResumes);
router.get('/score/latest', protect, resumeController.getLatestScore);

export default router;
