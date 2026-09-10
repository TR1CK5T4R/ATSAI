/**
 * users.validation.js — Joi validation schemas for auth and user endpoints
 */

import Joi from 'joi';

export const registerSchema = {
    body: Joi.object().keys({
        name: Joi.string().trim().min(2).max(128).required().messages({
            'string.empty': 'Name cannot be empty',
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 128 characters',
            'any.required': 'Name is required',
        }),
        email: Joi.string().trim().email().lowercase().required().messages({
            'string.empty': 'Email cannot be empty',
            'string.email': 'Email must be a valid email address',
            'any.required': 'Email is required',
        }),
        password: Joi.string().min(6).max(128).required().messages({
            'string.empty': 'Password cannot be empty',
            'string.min': 'Password must be at least 6 characters long',
            'string.max': 'Password cannot exceed 128 characters',
            'any.required': 'Password is required',
        }),
        role: Joi.string().valid('candidate', 'recruiter', 'admin').default('candidate').messages({
            'any.only': 'Role must be one of: candidate, recruiter, admin',
        }),
    }),
};

export const loginSchema = {
    body: Joi.object().keys({
        email: Joi.string().trim().email().lowercase().required().messages({
            'string.empty': 'Email cannot be empty',
            'string.email': 'Email must be a valid email address',
            'any.required': 'Email is required',
        }),
        password: Joi.string().required().messages({
            'string.empty': 'Password cannot be empty',
            'any.required': 'Password is required',
        }),
    }),
};

export const updateProfileSchema = {
    body: Joi.object().keys({
        name: Joi.string().trim().min(2).max(128).optional().messages({
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 128 characters',
        }),
        email: Joi.string().trim().email().lowercase().optional().messages({
            'string.email': 'Email must be a valid email address',
        }),
        password: Joi.string().min(6).max(128).optional().messages({
            'string.min': 'Password must be at least 6 characters long',
            'string.max': 'Password cannot exceed 128 characters',
        }),
    }).min(1).messages({
        'object.min': 'At least one field (name, email, or password) must be provided to update',
    }),
};

export const refreshSchema = {
    body: Joi.object().keys({
        refreshToken: Joi.string().optional(),
    }),
};

export default {
    register: registerSchema,
    login: loginSchema,
    updateProfile: updateProfileSchema,
    refresh: refreshSchema,
};
