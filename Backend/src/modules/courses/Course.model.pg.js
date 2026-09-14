/**
 * Course.model.pg.js — Sequelize model for the course catalog
 *
 * Stores curated paid courses. The `skillTag` field is used by the
 * Gemini recommendation engine to match skill gaps to relevant courses.
 *
 * Fields:
 *   id          UUID PK
 *   title       STRING  — course title
 *   skillTag    STRING  — primary skill this course covers (e.g. 'React', 'System Design')
 *   price       DECIMAL — price in `currency` (0 = free); returned as a JS number
 *   currency    STRING  — ISO 4217 code (default USD)
 *   url         STRING  — link to the course
 *   description TEXT    — short description
 *
 * Associations: none (referenced by recommendation engine, not FK'd to users)
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const Course = sequelize.define(
    'Course',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING(256),
            allowNull: false,
            unique: true,           // enables ON CONFLICT (title) upsert in seed script
        },
        skillTag: {
            type: DataTypes.STRING(128),
            allowNull: false,
            field: 'skill_tag',
            comment: 'Primary skill keyword for recommendation matching',
        },
        price: {
            type: DataTypes.DECIMAL(8, 2),
            allowNull: false,
            defaultValue: 0.00,
            validate: { min: 0 },
            comment: 'Price in `currency` (0.00 = free)',
            // pg returns DECIMAL as a string to avoid float loss; prices fit a JS number safely
            get() {
                const raw = this.getDataValue('price');
                return raw === null || raw === undefined ? raw : Number(raw);
            },
        },
        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'USD',
            comment: 'ISO 4217 currency code',
        },
        url: {
            type: DataTypes.STRING(2048),
            allowNull: false,
            validate: { isUrl: true },
            comment: 'Link to the course listing',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Short description shown in the courses page',
        },
    },
    {
        tableName: 'courses',
        timestamps: true,
        underscored: true,
    }
);

export default Course;
