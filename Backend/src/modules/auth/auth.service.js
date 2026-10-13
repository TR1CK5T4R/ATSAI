/**
 * auth.service.js — Business logic for authentication
 *
 * Responsibilities:
 *   - registerUser: validate uniqueness, create user (mapping password → passwordHash)
 *   - loginUser: verify credentials via User.isPasswordMatch()
 *   - generateToken: sign JWT with configured secret + expiry
 */

import jwt from 'jsonwebtoken';
import User from './auth.model.js';
import ApiError from '../../utils/ApiError.js';
import config from '../../config/env.js';

/**
 * Register a new user.
 * @param {{ name, email, password, role? }} userBody
 * @returns {{ user: User, token: string }}
 */
const registerUser = async ({ name, email, password, role }) => {
    // Check uniqueness before attempting insert (gives a clean 400 vs DB 409)
    if (await User.findOne({ where: { email } })) {
        throw new ApiError(400, 'Email is already registered');
    }

    // Map plain password → passwordHash field expected by the User model
    const user = await User.create({ name, email, passwordHash: password, role });
    const token = generateToken(user.id);
    return { user, token };
};

/**
 * Authenticate an existing user.
 * @param {string} email
 * @param {string} password - plain-text password from request body
 * @returns {{ user: User, token: string }}
 */
const loginUser = async (email, password) => {
    const user = await User.findOne({ where: { email } });

    if (!user || !(await user.isPasswordMatch(password))) {
        // Use the same message for both cases (prevent email enumeration)
        throw new ApiError(401, 'Incorrect email or password');
    }

    const token = generateToken(user.id);
    return { user, token };
};

/**
 * Sign a JWT for the given userId.
 * @param {string} userId - UUID from PostgreSQL
 * @returns {string} signed JWT
 */
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, config.jwtSecret, {
        expiresIn: config.jwtExpire,
    });
};

export default { registerUser, loginUser };
