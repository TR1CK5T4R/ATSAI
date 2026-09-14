/**
 * courses.validation.js — Joi schemas for the courses routes
 * Consumed by src/middleware/validate.middleware.js ({ body, params, query }).
 */

import Joi from 'joi';

const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP'];

const idParam = Joi.object({ id: Joi.string().uuid().required() });

const courseFields = {
    title: Joi.string().trim().min(3).max(256),
    skillTag: Joi.string().trim().min(1).max(128),
    price: Joi.number().min(0).max(1_000_000).precision(2),
    currency: Joi.string().trim().uppercase().valid(...CURRENCIES),
    url: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(2048),
    description: Joi.string().trim().max(2000).allow(''),
};

/** GET /courses */
const listCourses = {
    query: Joi.object({
        skillTag: Joi.string().trim().max(128),
        limit: Joi.number().integer().min(1).max(100).default(50),
        offset: Joi.number().integer().min(0).default(0),
    }),
};

/** GET /courses/:id · DELETE /courses/:id · POST /courses/:id/checkout */
const byId = { params: idParam };

/** POST /courses (admin) */
const createCourse = {
    body: Joi.object({
        ...courseFields,
        title: courseFields.title.required(),
        skillTag: courseFields.skillTag.required(),
        price: courseFields.price.required(),
        url: courseFields.url.required(),
    }),
};

/** PATCH /courses/:id (admin) — any subset of fields, at least one */
const updateCourse = {
    params: idParam,
    body: Joi.object(courseFields).min(1),
};

/** GET /courses/recommend/:interviewId */
const recommend = {
    params: Joi.object({ interviewId: Joi.string().uuid().required() }),
};

export default { listCourses, byId, createCourse, updateCourse, recommend };
