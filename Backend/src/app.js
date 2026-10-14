/**
 * app.js — Express application factory
 *
 * Middleware stack (in order):
 *   1. helmet        — secure HTTP headers
 *   2. cors          — cross-origin policy driven by CLIENT_URL env var
 *   3. express-rate-limit — 100 req / 15 min per IP (global), 10 req / 15 min on /api/auth
 *   4. morgan        — HTTP request logging (dev only)
 *   5. express.json  — JSON body parsing (max 10 mb)
 *   6. urlencoded    — form data parsing
 *   7. Routes        — /health, /api/*
 *   8. 404 handler   — catches unknown routes
 *   9. Error normaliser — upgrades non-ApiError errors
 *  10. Global error handler — formats and sends error response
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import config from './config/env.js';
import ApiError from './utils/ApiError.js';
import errorHandler from './middleware/error.middleware.js';

// ── Route modules ─────────────────────────────────────────────────────────────
import resumeRoutes   from './modules/resume/resume.routes.js';
import interviewRoutes from './modules/interview/interview.routes.js';
import usersRoutes, { authRouter, candidateRouter } from './modules/users/users.routes.js';
// courses routes added later; placeholder import is safe with an empty router
// import coursesRoutes  from './modules/courses/courses.routes.js';

const app = express();

// ── 1. Security headers ───────────────────────────────────────────────────────
app.use(helmet());

// ── 2. CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
    config.clientUrl,            // from .env  (e.g. http://localhost:5173)
    'http://localhost:3000',
    'http://localhost:5173',
].filter(Boolean);

app.use(
    cors({
        origin: (origin, cb) => {
            // Allow requests with no origin (curl, Postman, mobile)
            if (!origin) return cb(null, true);
            if (allowedOrigins.includes(origin)) return cb(null, true);
            cb(new Error(`CORS: origin '${origin}' not allowed`), false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// ── 3. Rate limiting ──────────────────────────────────────────────────────────
/** Global limiter: 100 requests per 15 minutes per IP */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true, // Return rate-limit info in `RateLimit-*` headers
    legacyHeaders: false,
    message: { code: 429, message: 'Too many requests, please try again later.' },
});

/** Stricter limiter for auth endpoints (brute-force protection) */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 429, message: 'Too many login attempts, please try again in 15 minutes.' },
});

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter); // applied in addition to globalLimiter

// ── 4. HTTP request logger ────────────────────────────────────────────────────
if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
} else {
    // Minimal combined log in production
    app.use(morgan('combined'));
}

// ── 5-6. Body parsers ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── 6b. Cookie parser (for httpOnly refresh token cookie) ────────────────────
app.use(cookieParser());

// ── 6c. Uploaded files are NOT served statically ──────────────────────────────
// Resumes contain personal data, so they are only downloadable through
// GET /api/resume/:id/file (login + ownership check → storage.getFile).

// ── 7. Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /health
 * Returns server status, env, and timestamp. Used by load-balancers / uptime monitors.
 */
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        env: config.nodeEnv,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// API & Root routes
app.use('/api/auth',      authRouter);
app.use('/auth',          authRouter);

app.use('/api/candidate', candidateRouter);
app.use('/candidate',     candidateRouter);

app.use('/api/users',     usersRoutes);
app.use('/users',         usersRoutes);

app.use('/api/resume',    resumeRoutes);
app.use('/api/interview', interviewRoutes);
// app.use('/api/courses',   coursesRoutes); // uncomment when module is ready

// Root sanity check
app.get('/', (_req, res) => {
    res.json({ message: '🚀 AI ATS API is running', version: '1.0.0' });
});

// ── 8. 404 handler ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
    next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// ── 9. Normalise non-ApiError errors ──────────────────────────────────────────
app.use((err, _req, _res, next) => {
    if (!(err instanceof ApiError)) {
        const statusCode = err.statusCode || 500;
        const message = err.message || 'Internal Server Error';
        next(new ApiError(statusCode, message, false, err.stack));
    } else {
        next(err);
    }
});

// ── 10. Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

export default app;
