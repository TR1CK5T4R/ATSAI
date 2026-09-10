/**
 * resume.validation.js — Joi schemas for the resume module
 *
 *  - RESUME_PARSED_SCHEMA validates/coerces the JSON Gemini returns
 *    (used by resume.ai.js on every attempt — bad LLM output = retry).
 *  - getResume validates the :id route param (must be a UUID).
 *  - uploadResume reserves room for future multipart body fields.
 */

import Joi from 'joi';

// ── Sub-schemas (unknown LLM fields are stripped, not passed through) ─────────
const experienceItem = Joi.object({
    title: Joi.string().trim().allow('').default(''),
    company: Joi.string().trim().allow('').default(''),
    startDate: Joi.string().trim().allow('').default(''),
    endDate: Joi.string().trim().allow('').default(''),
    description: Joi.string().trim().allow('').default(''),
});

const educationItem = Joi.object({
    degree: Joi.string().trim().allow('').default(''),
    institution: Joi.string().trim().allow('').default(''),
    year: Joi.string().trim().allow('').default(''),
});

const projectItem = Joi.object({
    name: Joi.string().trim().allow('').default(''),
    description: Joi.string().trim().allow('').default(''),
    technologies: Joi.array().items(Joi.string().trim().max(60)).default([]),
});

/**
 * Canonical shape of a parsed resume (mirrors the Gemini responseSchema in
 * resume.ai.js). Empty strings / empty arrays are VALID — real resumes are
 * messy, and hard-failing on a missing phone number would make parsing useless.
 */
const RESUME_PARSED_SCHEMA = Joi.object({
    name: Joi.string().trim().max(120).allow('').default(''),
    email: Joi.string().email({ tlds: false }).allow('').default(''),
    skills: Joi.array().items(Joi.string().trim().max(60)).default([]),
    experience: Joi.array().items(experienceItem).default([]),
    education: Joi.array().items(educationItem).default([]),
    projects: Joi.array().items(projectItem).default([]),
    experienceYears: Joi.number().min(0).max(60).default(0),
    seniorityLevel: Joi.string().trim().max(40).allow('').default(''),
});

/**
 * Validate + normalise a raw LLM JSON payload.
 * @param {Object} json - parsed Gemini response
 * @returns {{ error: import('joi').ValidationError|null, value: Object }}
 */
const validateParsedResume = (json) =>
    RESUME_PARSED_SCHEMA.validate(json, { abortEarly: false, stripUnknown: true });

// ── Route-param schema (GET /resume/:id) ──────────────────────────────────────
const getResume = {
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
};

// ── Multipart upload body (reserved for future metadata fields) ───────────────
const uploadResume = {
    body: Joi.object({}),
};

export default { uploadResume, getResume, RESUME_PARSED_SCHEMA, validateParsedResume };
export { validateParsedResume, RESUME_PARSED_SCHEMA };
