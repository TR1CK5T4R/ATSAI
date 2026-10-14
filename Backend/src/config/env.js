/**
 * env.js — Central environment configuration
 * Validates all required env vars at startup and exports a typed config object.
 * Import this instead of `process.env` directly throughout the app.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
dotenv.config();

// ── Required variables ────────────────────────────────────────────────────────
const REQUIRED = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'GEMINI_API_KEY'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(`\n❌ Missing required environment variables: ${missing.join(', ')}\n`);
    process.exit(1);
}

// Backend root directory (this file lives in Backend/src/config → root is ../../)
const BACKEND_ROOT = fileURLToPath(new URL('../../', import.meta.url));

// ── Exported config object ────────────────────────────────────────────────────
const config = {
    // Server
    port: parseInt(process.env.PORT, 10) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',

    // PostgreSQL
    postgresUri: process.env.DATABASE_URL,
    pgSsl: process.env.PG_SSL === 'true',           // set PG_SSL=true for cloud PG

    // MongoDB
    mongoUri: process.env.MONGO_URI || '',

    // Auth
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || '15m',            // access token lifetime
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d', // refresh token lifetime

    // Gemini
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    // Lightweight model for latency-critical live interview turns (~1.5–2 s target)
    geminiFastModel: process.env.GEMINI_FAST_MODEL || 'gemini-2.5-flash-lite',
    geminiMock: process.env.GEMINI_MOCK === 'true',   // dev/test: deterministic offline parsing

    // CORS
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

    // Payments — 'mock' until a real provider (razorpay | stripe) is plugged into services/payments
    paymentProvider: process.env.PAYMENT_PROVIDER || 'mock',

    // Upload / file storage
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5 MB
    storageDriver: process.env.STORAGE_DRIVER || 'local',                     // local | s3 | cloudinary
    uploadDir: process.env.UPLOAD_DIR || 'uploads',                           // local driver only
    uploadDirAbs: path.resolve(BACKEND_ROOT, process.env.UPLOAD_DIR || 'uploads'),
};

export default config;

