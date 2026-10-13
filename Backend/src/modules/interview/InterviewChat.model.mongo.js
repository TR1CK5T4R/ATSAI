/**
 * InterviewChat.model.mongo.js — Mongoose model for real-time interview transcripts
 *
 * Stored in MongoDB (ats_logs DB) for flexible, append-friendly chat storage.
 * The `interviewId` field links to the PostgreSQL `interviews.id` UUID.
 *
 * Schema:
 *   interviewId   String (UUID from PG) — indexed for fast lookup
 *   messages[]    Array of message subdocuments:
 *     role        'ai' | 'user'
 *     text        The spoken/typed content
 *     timestamp   When the message was recorded
 *     latencyMs   How many ms the AI took to respond (for 'ai' messages)
 *
 * Timestamps are managed manually via `timestamp` field (not Mongoose timestamps)
 * to preserve ordering precision and latency data.
 */

import mongoose from 'mongoose';

// ── Message sub-schema ────────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ['ai', 'user'],
            required: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        /** Only relevant for role='ai' — round-trip latency from question sent → answer received */
        latencyMs: {
            type: Number,
            default: null,
            min: 0,
        },
    },
    { _id: true } // give each message its own _id for easy referencing
);

// ── InterviewChat schema ──────────────────────────────────────────────────────
const interviewChatSchema = new mongoose.Schema(
    {
        interviewId: {
            type: String, // UUID string from PostgreSQL interviews table
            required: true,
            unique: true,
            index: true,
        },
        messages: {
            type: [messageSchema],
            default: [],
        },
    },
    {
        collection: 'interview_chats',
        // Use explicit createdAt / updatedAt via Mongoose timestamps option
        timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Compound index not needed here; interviewId unique index covers look-ups.

const InterviewChat = mongoose.model('InterviewChat', interviewChatSchema);

export default InterviewChat;
