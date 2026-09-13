/**
 * interview.model.pg.js — Sequelize model for interview sessions
 *
 * Fields:
 *   id                    UUID PK
 *   userId                FK → users.id (the candidate who owns the interview)
 *   resumeId              FK → resumes.id (which resume the questions were based on)
 *   targetRole            STRING — role the interview is tailored to
 *   status                ENUM — pending | ongoing | completed | cancelled
 *   questions             JSONB — the 8 planned questions [{ id, type, text }]
 *   currentQuestionIndex  INTEGER — index into `questions` being discussed
 *                         (== questions.length once every question is answered)
 *   scheduledAt           DATE — optional future scheduling
 *   score                 INTEGER 0-100 — overall interview score (set on finish)
 *   feedbackSummary       TEXT — Gemini-generated prose summary (set on finish)
 *   strengths             JSONB string[] (set on finish)
 *   weaknesses            JSONB string[] (set on finish)
 *   skillGaps             JSONB string[] — feeds course recommendations (set on finish)
 *   skillBreakdown        JSONB [{ skill, score }] — per-skill scores for charts (set on finish)
 *   completedAt           DATE
 *
 * The turn-by-turn transcript lives in MongoDB (InterviewChat.model.mongo.js).
 *
 * Associations (defined in src/models/index.js):
 *   Interview belongsTo User · Interview belongsTo Resume
 *   User hasMany Interviews · Interview hasMany Feedbacks
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
            allowNull: true,  // kept nullable so deleting a resume does not delete past interviews
            field: 'resume_id',
            references: { model: 'resumes', key: 'id' },
            onDelete: 'SET NULL',
        },
        targetRole: {
            type: DataTypes.STRING(120),
            allowNull: true,
            field: 'target_role',
        },
        status: {
            type: DataTypes.ENUM('pending', 'ongoing', 'completed', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
        },
        questions: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
            comment: 'Planned questions [{ id, type: technical|project|behavioral, text }]',
        },
        currentQuestionIndex: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'current_question_index',
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
        strengths: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        weaknesses: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        skillGaps: {
            type: DataTypes.JSONB,
            allowNull: true,
            field: 'skill_gaps',
            comment: 'Skills to improve — used to recommend courses',
        },
        skillBreakdown: {
            type: DataTypes.JSONB,
            allowNull: true,
            field: 'skill_breakdown',
        },
        completedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'completed_at',
        },
    },
    {
        tableName: 'interviews',
        timestamps: true,
        underscored: true,
    }
);

export default Interview;
