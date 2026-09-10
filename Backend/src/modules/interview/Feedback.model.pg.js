/**
 * Feedback.model.pg.js — Sequelize model for interview feedback
 *
 * Allows a recruiter/admin reviewer to leave structured feedback on a completed
 * interview session. Distinct from AI-generated feedbackSummary on Interview.
 *
 * Fields:
 *   id           UUID PK
 *   interviewId  FK → interviews.id
 *   reviewerId   FK → users.id  (the human reviewer)
 *   rating       INTEGER 1-5 — star rating
 *   comments     TEXT — free-text reviewer notes
 *
 * Associations (defined in src/models/index.js):
 *   Feedback belongsTo Interview
 *   Feedback belongsTo User (as reviewer)
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const Feedback = sequelize.define(
    'Feedback',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        interviewId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'interview_id',
            references: { model: 'interviews', key: 'id' },
            onDelete: 'CASCADE',
        },
        reviewerId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'reviewer_id',
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE',
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1, max: 5 },
            comment: 'Star rating 1-5 given by the human reviewer',
        },
        comments: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Free-text notes from the reviewer',
        },
    },
    {
        tableName: 'feedbacks',
        timestamps: true,
        underscored: true,
    }
);

export default Feedback;
