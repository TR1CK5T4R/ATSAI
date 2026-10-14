/**
 * error.middleware.js — Global Express error handler
 *
 * This is the LAST middleware registered in app.js.
 * It catches any error passed via next(err) and formats a consistent JSON response.
 *
 * Response shape:
 *   { code, message, stack? }   (stack only in development)
 *
 * Handles:
 *   - ApiError instances (operational errors with known statusCode)
 *   - Sequelize ValidationError → 400
 *   - Sequelize UniqueConstraintError → 409
 *   - JWT errors → 401
 *   - Generic Error → 500
 */

import ApiError from '../utils/ApiError.js';

const errorHandler = (err, _req, res, _next) => {
    let { statusCode = 500, message = 'Internal Server Error', isOperational } = err;

    // ── Map specific library errors to friendly HTTP codes ────────────────────

    // Sequelize validation errors
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        statusCode = err.name === 'SequelizeUniqueConstraintError' ? 409 : 400;
        message = err.errors ? err.errors.map((e) => e.message).join(', ') : err.message;
        isOperational = true;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        isOperational = true;
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        isOperational = true;
    }

    // Multer file-size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 413;
        message = 'File too large';
        isOperational = true;
    }

    // Unexpected (programmer/DB) errors: never leak internals such as SQL text in production
    if (!isOperational && statusCode >= 500 && process.env.NODE_ENV === 'production') {
        message = 'Internal Server Error';
    }

    // ── Build response ────────────────────────────────────────────────────────
    const body = {
        code: statusCode,
        message,
    };

    // Include stack trace in development for non-operational (programmer) errors
    if (process.env.NODE_ENV === 'development' && !isOperational) {
        body.stack = err.stack;
    }

    // Log server-side errors
    if (statusCode >= 500) {
        console.error('[ERROR]', err);
    }

    res.status(statusCode).json(body);
};

export default errorHandler;
