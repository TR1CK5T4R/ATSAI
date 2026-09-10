/**
 * Resume.model.js — Sequelize model for uploaded resumes
 *
 * Fields:
 *   id               UUID PK
 *   userId           FK → users.id
 *   fileUrl          STRING  — path/URL to uploaded PDF
 *   parsedJson       JSONB   — full Gemini-parsed resume object
 *   skills           ARRAY   — extracted skill tags (e.g. ['React','Node'])
 *   experienceYears  FLOAT   — total years of experience detected
 *
 * Associations (defined in src/models/index.js):
 *   Resume belongsTo User
 *   User hasMany Resumes
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const Resume = sequelize.define(
    'Resume',
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
        fileUrl: {
            type: DataTypes.STRING(2048),
            allowNull: true, // null when uploaded as raw text (no file storage)
            field: 'file_url',
            comment: 'Relative or absolute URL to the stored PDF file',
        },
        parsedJson: {
            type: DataTypes.JSONB,   // JSONB gives indexable JSON in Postgres
            allowNull: true,
            defaultValue: {},
            field: 'parsed_json',
            comment: 'Structured output from Gemini resume-parser prompt',
        },
        skills: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
            defaultValue: [],
            comment: 'Flat list of skill tags extracted from resume',
        },
        experienceYears: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: 0,
            field: 'experience_years',
            validate: { min: 0, max: 60 },
        },
    },
    {
        tableName: 'resumes',
        timestamps: true,
        underscored: true,
    }
);

export default Resume;
