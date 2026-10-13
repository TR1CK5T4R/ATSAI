/**
 * server.js — Application entry point
 *
 * Boot sequence:
 *   1. Load env vars (via config/env.js import chain)
 *   2. Import Sequelize models index  → registers all models + associations
 *   3. connectDB()   → authenticate + sync PostgreSQL
 *   4. connectMongo() → connect MongoDB (non-fatal if MONGO_URI absent)
 *   5. Create HTTP server from Express app
 *   6. Attach Socket.io for real-time interview chat
 *   7. Listen on PORT
 *   8. Register graceful shutdown handlers
 */

import 'dotenv/config';                      // load .env first

// Models must be imported BEFORE connectDB so Sequelize knows about them before sync
import './src/models/index.js';

import http from 'http';
import { Server } from 'socket.io';

import app from './src/app.js';
import config from './src/config/env.js';
import { connectDB } from './src/config/database.js';
import connectMongo from './src/config/mongo.js';

// ── Boot ──────────────────────────────────────────────────────────────────────
const startServer = async () => {
    // ── 3. PostgreSQL ─────────────────────────────────────────────────────────
    await connectDB();

    // ── 4. MongoDB ───────────────────────────────────────────────────────────
    await connectMongo();

    // ── 5. HTTP server ────────────────────────────────────────────────────────
    const server = http.createServer(app);

    // ── 6. Socket.io ─────────────────────────────────────────────────────────
    const io = new Server(server, {
        cors: {
            origin: [config.clientUrl, 'http://localhost:5173', 'http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Make io available in request handlers via app.locals
    app.locals.io = io;

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        /** Join a private room for one interview session */
        socket.on('join_interview', ({ interviewId }) => {
            socket.join(`interview:${interviewId}`);
            console.log(`Socket ${socket.id} joined room interview:${interviewId}`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });

    // ── 7. Listen ─────────────────────────────────────────────────────────────
    server.listen(config.port, () => {
        console.log(`\n🚀 Server running on http://localhost:${config.port}`);
        console.log(`   ENV: ${config.nodeEnv}`);
        console.log(`   Health: http://localhost:${config.port}/health\n`);
    });

    // ── 8. Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = (signal) => {
        console.log(`\n${signal} received — shutting down gracefully...`);
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
        // Force exit after 10s if connections are still open
        setTimeout(() => {
            console.error('Force exit after timeout');
            process.exit(1);
        }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
        console.error('💥 uncaughtException:', err);
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
        console.error('💥 unhandledRejection:', reason);
        shutdown('unhandledRejection');
    });
};

startServer();
