/**
 * User.model.js — Sequelize model for platform users
 *
 * Fields:
 *   id            UUID PK (auto-generated)
 *   name          STRING  — display name
 *   email         STRING  — unique, validated
 *   passwordHash  STRING  — bcrypt hash (NEVER store plain text)
 *   role          ENUM    — candidate | recruiter | admin
 *
 * Hooks:
 *   beforeCreate / beforeUpdate — auto-hash password when changed
 *
 * Instance methods:
 *   isPasswordMatch(plain) → Boolean
 */

import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import { sequelize } from '../../config/database.js';

const BCRYPT_ROUNDS = 12;

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(128),
            allowNull: false,
            validate: { len: [2, 128] },
        },
        email: {
            type: DataTypes.STRING(254),
            allowNull: false,
            unique: true,
            validate: { isEmail: true },
        },
        passwordHash: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'password_hash', // postgres column name
        },
        role: {
            type: DataTypes.ENUM('candidate', 'recruiter', 'admin'),
            allowNull: false,
            defaultValue: 'candidate',
        },
    },
    {
        tableName: 'users',
        timestamps: true, // createdAt, updatedAt
        underscored: true, // snake_case column names
        hooks: {
            /** Hash the password before INSERT */
            beforeCreate: async (user) => {
                if (user.passwordHash) {
                    user.passwordHash = await bcrypt.hash(user.passwordHash, BCRYPT_ROUNDS);
                }
            },
            /** Re-hash only when passwordHash field changes on UPDATE */
            beforeUpdate: async (user) => {
                if (user.changed('passwordHash')) {
                    user.passwordHash = await bcrypt.hash(user.passwordHash, BCRYPT_ROUNDS);
                }
            },
        },
    }
);

/**
 * Compare a plain-text password against the stored hash.
 * @param {string} plain - Password to check
 * @returns {Promise<boolean>}
 */
User.prototype.isPasswordMatch = async function (plain) {
    return bcrypt.compare(plain, this.passwordHash);
};

export default User;
