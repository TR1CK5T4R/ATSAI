/**
 * User.model.js — Sequelize model for platform users
 *
 * Fields:
 *   id            UUID PK (auto-generated)
 *   name          STRING  — display name
 *   email         STRING  — unique, validated
 *   passwordHash  STRING  — bcrypt hash (12 rounds, NEVER store plain text)
 *   role          ENUM    — candidate | recruiter | admin
 *
 * Hooks:
 *   beforeCreate / beforeUpdate — auto-hash password with bcrypt (12 rounds)
 *
 * Methods:
 *   isPasswordMatch(plain) → Boolean
 *   toJSON() → Object with passwordHash omitted
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
            /** Hash the password before INSERT (12 rounds) */
            beforeCreate: async (user) => {
                if (user.passwordHash) {
                    user.passwordHash = await bcrypt.hash(user.passwordHash, BCRYPT_ROUNDS);
                }
            },
            /** Re-hash only when passwordHash field changes on UPDATE (12 rounds) */
            beforeUpdate: async (user) => {
                if (user.changed('passwordHash')) {
                    user.passwordHash = await bcrypt.hash(user.passwordHash, BCRYPT_ROUNDS);
                }
            },
        },
    }
);

/**
 * Compare a plain-text password against the stored bcrypt hash.
 * @param {string} plain - Password to check
 * @returns {Promise<boolean>}
 */
User.prototype.isPasswordMatch = async function (plain) {
    return bcrypt.compare(plain, this.passwordHash);
};

/**
 * Omit sensitive passwordHash from JSON serialization.
 */
User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
};

export default User;
