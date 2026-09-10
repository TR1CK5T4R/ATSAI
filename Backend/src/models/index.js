/**
 * src/models/index.js — Central Sequelize model registry
 *
 * Imports every Sequelize model, registers associations, and re-exports
 * them together with the sequelize instance.
 *
 * ── Why centralise associations here? ──────────────────────────────────────
 * Sequelize associations (hasMany / belongsTo) must be defined AFTER all
 * models are loaded to avoid circular-import issues. This file is the single
 * place that knows about all models, so it is the right place for wiring.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *   import { User, Resume, Interview, Feedback, Course } from '../models/index.js';
 */

import { sequelize } from '../config/database.js';

// ── Import all Sequelize models ───────────────────────────────────────────────
import User      from '../modules/users/User.model.js';
import Resume    from '../modules/resume/resume.model.pg.js';
import Interview from '../modules/interview/Interview.model.pg.js';
import Feedback  from '../modules/interview/Feedback.model.pg.js';
import Course    from '../modules/courses/Course.model.pg.js';

// ── Associations ──────────────────────────────────────────────────────────────

// User ↔ Resume  (one user can have many resumes over time)
User.hasMany(Resume,     { foreignKey: 'userId', as: 'resumes',         onDelete: 'CASCADE' });
Resume.belongsTo(User,   { foreignKey: 'userId', as: 'user' });

// User ↔ Interview  (one user, many interview sessions)
User.hasMany(Interview,      { foreignKey: 'userId', as: 'interviews',  onDelete: 'CASCADE' });
Interview.belongsTo(User,    { foreignKey: 'userId', as: 'candidate' });

// Resume ↔ Interview  (each session is based on one resume)
Resume.hasMany(Interview,    { foreignKey: 'resumeId', as: 'sessions',  onDelete: 'SET NULL' });
Interview.belongsTo(Resume,  { foreignKey: 'resumeId', as: 'resume' });

// Interview ↔ Feedback  (one session, many feedback entries from reviewers)
Interview.hasMany(Feedback,  { foreignKey: 'interviewId', as: 'feedbacks', onDelete: 'CASCADE' });
Feedback.belongsTo(Interview,{ foreignKey: 'interviewId', as: 'interview' });

// Feedback ↔ User (reviewer)
User.hasMany(Feedback,       { foreignKey: 'reviewerId', as: 'givenFeedbacks', onDelete: 'CASCADE' });
Feedback.belongsTo(User,     { foreignKey: 'reviewerId', as: 'reviewer' });

// ── Exports ───────────────────────────────────────────────────────────────────
export { sequelize, User, Resume, Interview, Feedback, Course };
