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
// Gemini's responseSchema marks nested fields nullable, so null is coerced to ''
// (Joi `.default()` only fills undefined; `.empty(null)` makes null count as unset).
const optText = (max) => Joi.string().trim().max(max).truncate().allow('').empty(null).default('');

const experienceItem = Joi.object({
    title: optText(200),
    company: optText(200),
    startDate: optText(40),
    endDate: optText(40),
    description: optText(2000),
});

const educationItem = Joi.object({
    degree: optText(200),
    institution: optText(200),
    year: optText(40),
});

const projectItem = Joi.object({
    name: optText(200),
    description: optText(2000),
    technologies: Joi.array().items(Joi.string().trim().max(60).truncate()).empty(null).default([]),
});

/** Allowed seniority buckets — kept in sync with the Gemini enum in resume.ai.js */
const SENIORITY_LEVELS = ['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Principal'];

/**
 * Canonical shape of a parsed resume (mirrors the Gemini responseSchema in
 * resume.ai.js). Empty strings / empty arrays are VALID — real resumes are
 * messy, and hard-failing on a missing phone number would make parsing useless.
 * Over-long strings are truncated rather than rejected for the same reason;
 * structural problems (wrong types, unknown seniority) still fail → retry.
 */
const RESUME_PARSED_SCHEMA = Joi.object({
    name: optText(120),
    // An unparseable email (e.g. "name at gmail dot com") is blanked, not fatal
    email: Joi.string().trim().lowercase().email({ tlds: false }).allow('').empty(null).default('').failover(''),
    skills: Joi.array().items(Joi.string().trim().max(60).truncate()).empty(null).default([]),
    experience: Joi.array().items(experienceItem).empty(null).default([]),
    education: Joi.array().items(educationItem).empty(null).default([]),
    projects: Joi.array().items(projectItem).empty(null).default([]),
    experienceYears: Joi.number().min(0).max(60).empty(null).default(0),
    seniorityLevel: Joi.string().trim().valid(...SENIORITY_LEVELS, '').empty(null).default(''),
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
export { validateParsedResume, RESUME_PARSED_SCHEMA, SENIORITY_LEVELS };
