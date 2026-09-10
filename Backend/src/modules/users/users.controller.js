/**
 * users.controller.js — Controller handling authentication and candidate profile endpoints
 */

import catchAsync from '../../utils/catchAsync.js';
import usersService from './users.service.js';
import config from '../../config/env.js';

/**
 * Common cookie options for refresh token
 */
const getRefreshTokenCookieOptions = () => ({
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
});

/**
 * POST /auth/register
 */
export const register = catchAsync(async (req, res) => {
    const { user, accessToken, refreshToken } = await usersService.registerUser(req.body);

    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: user.toJSON(),
        token: accessToken,
        accessToken,
    });
});

/**
 * POST /auth/login
 */
export const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await usersService.loginUser(email, password);

    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    res.status(200).json({
        success: true,
        message: 'Login successful',
        user: user.toJSON(),
        token: accessToken,
        accessToken,
    });
});

/**
 * POST /auth/refresh-token or POST /auth/refresh
 */
export const refreshToken = catchAsync(async (req, res) => {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const { user, accessToken, refreshToken: newRefreshToken } = await usersService.refreshAuth(token);

    res.cookie('refreshToken', newRefreshToken, getRefreshTokenCookieOptions());

    res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        user: user.toJSON(),
        token: accessToken,
        accessToken,
    });
});

/**
 * POST /auth/logout
 */
export const logout = catchAsync(async (_req, res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        path: '/',
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
});

/**
 * GET /candidate/profile or GET /auth/me
 */
export const getCandidateProfile = catchAsync(async (req, res) => {
    const profile = await usersService.getCandidateProfile(req.user.id);

    res.status(200).json({
        success: true,
        profile: profile.toJSON(),
        user: profile.toJSON(),
    });
});

/**
 * PUT /candidate/profile
 */
export const updateCandidateProfile = catchAsync(async (req, res) => {
    const updatedUser = await usersService.updateCandidateProfile(req.user.id, req.body);

    res.status(200).json({
        success: true,
        message: 'Candidate profile updated successfully',
        profile: updatedUser.toJSON(),
        user: updatedUser.toJSON(),
    });
});

export default {
    register,
    login,
    refreshToken,
    logout,
    getCandidateProfile,
    updateCandidateProfile,
};
