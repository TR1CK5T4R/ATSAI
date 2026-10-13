/**
 * Interview.model.pg.js — Sequelize model for interview sessions
 *
 * Fields:
 *   id               UUID PK
 *   userId           FK → users.id
 *   resumeId         FK → resumes.id  (which resume the questions were based on)
 *   status           ENUM — pending | ongoing | completed | cancelled
 *   scheduledAt      DATE — optional future scheduling
 *   score            INTEGER 0-100 — overall interview score
 *   feedbackSummary  TEXT — Gemini-generated prose feedback
 *
 * Associations (defined in src/models/index.js):
 *   Interview belongsTo User
 *   Interview belongsTo Resume
 *   User hasMany Interviews
 *   Interview hasMany Feedbacks
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const Interview = sequelize.define(
    'Interview',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'user_id',
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
        },
        resumeId: {
            type: DataTypes.UUID,
            allowNull: true,  // null if interview started without a resume
            field: 'resume_id',
            references: { model: 'resumes', key: 'id' },
            onDelete: 'SET NULL',
        },
        status: {
            type: DataTypes.ENUM('pending', 'ongoing', 'completed', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
        },
        scheduledAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'scheduled_at',
            comment: 'Optional future scheduling timestamp',
        },
        score: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: { min: 0, max: 100 },
            comment: 'Aggregate interview score 0-100',
        },
        feedbackSummary: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'feedback_summary',
            comment: 'Gemini-generated prose summary of performance',
        },
    },
    {
        tableName: 'interviews',
        timestamps: true,
        underscored: true,
    }
);

export default Interview;
