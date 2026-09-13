/**
 * InterviewChat.model.mongo.js — Mongoose model for real-time interview transcripts
 *
 * Stored in MongoDB (ats_logs DB) for flexible, append-friendly chat storage.
 * `interviewId` links to the PostgreSQL `interviews.id` UUID.
 *
 * Schema:
 *   interviewId   String (UUID from PG) — unique, indexed
 *   userId        String (UUID of the candidate) — indexed for per-user queries
 *   messages[]    Message subdocuments, appended with atomic $push:
 *     role           'ai' | 'user'
 *     text           The spoken/typed content
 *     kind           AI turns only: 'question' (planned) | 'follow_up' | 'closing'
 *     questionIndex  Which planned question (0-based) this turn belongs to
 *     latencyMs      AI turns only: Gemini round-trip time for this reply
 *     source         AI turns only: 'llm' | 'fallback' (timeout/error) | 'mock' | 'plan'
 *     timestamp      When the message was recorded
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
        kind: {
            type: String,
            enum: ['question', 'follow_up', 'closing', null],
            default: null,
        },
        questionIndex: {
            type: Number,
            default: null,
            min: 0,
        },
        latencyMs: {
            type: Number,
            default: null,
            min: 0,
        },
        source: {
            type: String,
            enum: ['llm', 'fallback', 'mock', 'plan', null],
            default: null,
        },
        timestamp: {
            type: Date,
            default: Date.now,
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
        userId: {
            type: String,
            required: true,
            index: true,
        },
        messages: {
            type: [messageSchema],
            default: [],
        },
    },
    {
        collection: 'interview_chats',
        timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    }
);

const InterviewChat = mongoose.model('InterviewChat', interviewChatSchema);

export default InterviewChat;
