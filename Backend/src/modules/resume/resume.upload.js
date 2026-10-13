/**
 * resume.upload.js — Multer middleware for the resume upload endpoint
 *
 *  - Memory storage: the buffer is kept in RAM only; persistence to disk /
 *    cloud is the storage service's job (src/services/storage). This keeps the
 *    driver swap (local → S3/Cloudinary) completely transparent.
 *  - Accepts PDF and DOCX only (mimetype whitelist, with an extension
 *    fallback for clients that send application/octet-stream).
 *  - 5 MB limit (config.maxFileSize ← MAX_FILE_SIZE env var).
 *  - Magic bytes are verified again later in resume.parser.js, so a renamed
 *    .txt can never reach the text extractors.
 */

import path from 'node:path';
import multer from 'multer';
import config from '../../config/env.js';
import ApiError from '../../utils/ApiError.js';

const ALLOWED_MIME = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);
const ALLOWED_EXT = new Set(['.pdf', '.docx']);
const MAX_FILE_SIZE_MB = Math.round(config.maxFileSize / (1024 * 1024));

const baseUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: config.maxFileSize,
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const mimeOk = ALLOWED_MIME.has(file.mimetype);
        const genericMime = !file.mimetype || file.mimetype === 'application/octet-stream';

        if (mimeOk || (genericMime && ALLOWED_EXT.has(ext))) {
            return cb(null, true);
        }
        cb(
            new ApiError(
                400,
                `Only PDF or DOCX resumes are allowed (got: ${file.mimetype || 'unknown type'})`
            ),
            false
        );
    },
});

/**
 * Wrapped `single('resume')` so Multer's own errors surface as clear
 * ApiErrors instead of raw 500s (the global handler only special-cases
 * LIMIT_FILE_SIZE; we give every Multer code a human message).
 */
const resumeUpload = (req, res, next) => {
    baseUpload.single('resume')(req, res, (err) => {
        if (!err) return next();

        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(413, `File too large — maximum resume size is ${MAX_FILE_SIZE_MB} MB`));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ApiError(400, "Unexpected file field — send the file as 'resume'"));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new ApiError(400, 'Only one resume file can be uploaded at a time'));
        }
        return next(err);
    });
};

export default resumeUpload;
