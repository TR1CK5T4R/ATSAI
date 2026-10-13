/**
 * auth.middleware.js — JWT authentication + role-based authorization
 *
 * Exports:
 *   authenticate       — verifies Bearer access token, attaches req.user
 *   authorizeRoles()   — role guard factory: authorizeRoles('admin', 'recruiter')
 *
 * Token strategy:
 *   - Access token (JWT, 15 m) sent in Authorization: Bearer <token> header
 *   - Refresh token (JWT, 7 d) sent in httpOnly, Secure, SameSite=Strict cookie
 *     named `refreshToken`. Rotation happens in POST /auth/refresh-token.
 */

import jwt from 'jsonwebtoken';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import config from '../config/env.js';
import User from '../modules/users/User.model.js';

// ── authenticate ──────────────────────────────────────────────────────────────
/**
 * Middleware: extract + verify the JWT access token from the Authorization header.
 * On success, attaches the full user record (minus passwordHash) to req.user.
 */
const authenticate = catchAsync(async (req, _res, next) => {
    // 1. Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new ApiError(401, 'No access token provided'));
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify signature + expiry
    let decoded;
    try {
        decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new ApiError(401, 'Access token expired — please refresh'));
        }
        return next(new ApiError(401, 'Invalid access token'));
    }

    // 3. Fetch user (catches deleted accounts)
    const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['passwordHash'] },
    });

    if (!user) {
        return next(new ApiError(401, 'User belonging to this token no longer exists'));
    }

    req.user = user;
    next();
});

// ── authorizeRoles ────────────────────────────────────────────────────────────
/**
 * Role guard factory.
 * Usage: router.get('/admin', authenticate, authorizeRoles('admin'), handler)
 *
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'recruiter', 'candidate')
 * @returns Express middleware
 */
const authorizeRoles = (...roles) => (req, _res, next) => {
    if (!req.user) {
        return next(new ApiError(401, 'You must be logged in'));
    }
    if (!roles.includes(req.user.role)) {
        return next(
            new ApiError(
                403,
                `Role '${req.user.role}' is not permitted to access this route. Required: ${roles.join(' | ')}`
            )
        );
    }
    next();
};

// Keep backward-compat alias used by existing routes
const protect = authenticate;

export { authenticate, authorizeRoles, protect };
