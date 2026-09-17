/**
 * users.service.js — Business logic for user authentication and candidate profiles
 */

import jwt from 'jsonwebtoken';
import { Op, fn, col, literal } from 'sequelize';
import User from './User.model.js';
import Interview from '../interview/interview.model.pg.js';
import ApiError from '../../utils/ApiError.js';
import config from '../../config/env.js';

/**
 * Generate access and refresh tokens for a user.
 * Access token: 15 minutes
 * Refresh token: 7 days
 *
 * @param {User} user
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export const generateAuthTokens = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
    };

    const accessToken = jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpire || '15m',
    });

    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
        expiresIn: config.jwtRefreshExpire || '7d',
    });

    return { accessToken, refreshToken };
};

/**
 * Register a new user with bcrypt-hashed password (12 rounds) and return auth tokens.
 *
 * @param {{ name: string, email: string, password: string, role?: string }} userData
 * @returns {Promise<{ user: User, accessToken: string, refreshToken: string }>}
 */
export const registerUser = async ({ name, email, password, role = 'candidate' }) => {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
        throw new ApiError(400, 'Email is already registered');
    }

    // passwordHash is passed here; User model hook hashes with bcrypt (12 rounds)
    const user = await User.create({
        name,
        email,
        passwordHash: password,
        role,
    });

    const { accessToken, refreshToken } = generateAuthTokens(user);
    return { user, accessToken, refreshToken };
};

/**
 * Authenticate user by email & password, returning auth tokens.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: User, accessToken: string, refreshToken: string }>}
 */
export const loginUser = async (email, password) => {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.isPasswordMatch(password))) {
        throw new ApiError(401, 'Invalid email or password');
    }

    const { accessToken, refreshToken } = generateAuthTokens(user);
    return { user, accessToken, refreshToken };
};

/**
 * Verify a refresh token and issue new access & refresh tokens.
 *
 * @param {string} refreshToken
 * @returns {Promise<{ user: User, accessToken: string, refreshToken: string }>}
 */
export const refreshAuth = async (refreshToken) => {
    if (!refreshToken) {
        throw new ApiError(401, 'Refresh token required');
    }

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new ApiError(401, 'Refresh token expired — please log in again');
        }
        throw new ApiError(401, 'Invalid refresh token');
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
        throw new ApiError(401, 'User belonging to refresh token no longer exists');
    }

    const tokens = generateAuthTokens(user);
    return { user, ...tokens };
};

/**
 * Retrieve candidate profile by user ID.
 *
 * @param {string} userId
 * @returns {Promise<User>}
 */
export const getCandidateProfile = async (userId) => {
    const user = await User.findByPk(userId);
    if (!user) {
        throw new ApiError(404, 'Candidate profile not found');
    }
    return user;
};

/**
 * Update candidate profile (name, email, password).
 *
 * @param {string} userId
 * @param {{ name?: string, email?: string, password?: string }} updateData
 * @returns {Promise<User>}
 */
export const updateCandidateProfile = async (userId, updateData) => {
    const user = await User.findByPk(userId);
    if (!user) {
        throw new ApiError(404, 'Candidate profile not found');
    }

    if (updateData.email && updateData.email !== user.email) {
        const emailExists = await User.findOne({
            where: {
                email: updateData.email,
                id: { [Op.ne]: userId },
            },
        });
        if (emailExists) {
            throw new ApiError(400, 'Email is already taken by another account');
        }
        user.email = updateData.email;
    }

    if (updateData.name) {
        user.name = updateData.name;
    }

    if (updateData.password) {
        // triggers beforeUpdate hook to re-hash with 12 rounds bcrypt
        user.passwordHash = updateData.password;
    }

    await user.save();
    return user;
};

/**
 * Candidates with interview stats — recruiter/admin view (GET /users/candidates).
 * One page of candidates, then one aggregate query + one "latest completed"
 * query for just those ids (avoids N+1).
 *
 * @param {{ q?: string, limit: number, offset: number }} params
 * @returns {Promise<{ total, limit, offset, items: Array }>}
 */
export const listCandidates = async ({ q, limit, offset }) => {
    const where = { role: 'candidate' };
    if (q) {
        where[Op.or] = [{ name: { [Op.iLike]: `%${q}%` } }, { email: { [Op.iLike]: `%${q}%` } }];
    }

    const { count, rows } = await User.findAndCountAll({
        where,
        attributes: ['id', 'name', 'email', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
    });
    const ids = rows.map((u) => u.id);
    if (!ids.length) return { total: count, limit, offset, items: [] };

    const [stats, completed] = await Promise.all([
        Interview.findAll({
            where: { userId: ids },
            attributes: [
                ['user_id', 'userId'],
                [fn('COUNT', col('id')), 'interviewCount'],
                [fn('COUNT', literal("CASE WHEN status = 'completed' THEN 1 END")), 'completedCount'],
                [fn('ROUND', fn('AVG', col('score'))), 'avgScore'],
                [fn('MAX', col('score')), 'bestScore'],
                [fn('MAX', col('created_at')), 'lastInterviewAt'],
            ],
            group: ['user_id'],
            raw: true,
        }),
        Interview.findAll({
            where: { userId: ids, status: 'completed' },
            attributes: ['id', 'userId', 'score', 'targetRole', 'completedAt'],
            order: [['completedAt', 'DESC']],
        }),
    ]);

    const statsByUser = new Map(stats.map((s) => [s.userId, s]));
    const latestByUser = new Map();
    for (const i of completed) if (!latestByUser.has(i.userId)) latestByUser.set(i.userId, i);

    const toInt = (v) => (v === null || v === undefined ? null : Number(v));
    return {
        total: count,
        limit,
        offset,
        items: rows.map((u) => {
            const s = statsByUser.get(u.id);
            const latest = latestByUser.get(u.id);
            return {
                id: u.id,
                name: u.name,
                email: u.email,
                joinedAt: u.createdAt,
                interviewCount: toInt(s?.interviewCount) ?? 0,
                completedCount: toInt(s?.completedCount) ?? 0,
                avgScore: toInt(s?.avgScore),
                bestScore: toInt(s?.bestScore),
                lastInterviewAt: s?.lastInterviewAt ?? null,
                latest: latest
                    ? { interviewId: latest.id, score: latest.score, targetRole: latest.targetRole, completedAt: latest.completedAt }
                    : null,
            };
        }),
    };
};

export default {
    listCandidates,
    generateAuthTokens,
    registerUser,
    loginUser,
    refreshAuth,
    getCandidateProfile,
    updateCandidateProfile,
};
