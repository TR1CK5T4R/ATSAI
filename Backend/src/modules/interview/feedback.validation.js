/**
 * feedback.validation.js — Joi schemas for reviewer feedback routes
 */

import Joi from 'joi';

/** POST /feedback/add */
const addFeedback = {
    body: Joi.object({
        interviewId: Joi.string().uuid().required(),
        rating: Joi.number().integer().min(1).max(5).required(),
        comments: Joi.string().trim().max(2000).allow('').default(''),
    }),
};

/** GET /feedback/interview/:interviewId */
const listForInterview = {
    params: Joi.object({ interviewId: Joi.string().uuid().required() }),
};

export default { addFeedback, listForInterview };
