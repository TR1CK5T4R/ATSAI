/**
 * interview.validation.js — Joi schemas for the interview routes
 * Consumed by src/middleware/validate.middleware.js ({ body, params, query }).
 */

import Joi from 'joi';

const idParam = Joi.object({
    id: Joi.string().uuid().required(),
});

/** POST /interview/create */
const createInterview = {
    body: Joi.object({
        resumeId: Joi.string().uuid().required(),
        // Optional — derived from the resume (seniority + latest title) when omitted
        targetRole: Joi.string().trim().min(2).max(120),
    }),
};

/** POST /interview/:id/answer */
const submitAnswer = {
    params: idParam,
    body: Joi.object({
        // Speech-to-text output; capped so one turn cannot blow up the prompt
        text: Joi.string().trim().min(1).max(4000).required(),
    }),
};

/** POST /interview/:id/finish · GET /interview/:id */
const byId = {
    params: idParam,
};

/** GET /interview/history */
const history = {
    query: Joi.object({
        limit: Joi.number().integer().min(1).max(50).default(20),
        offset: Joi.number().integer().min(0).default(0),
        status: Joi.string().valid('ongoing', 'completed'),
        // Staff only — filter by candidate
        userId: Joi.string().uuid(),
    }),
};

export default { createInterview, submitAnswer, byId, history };
