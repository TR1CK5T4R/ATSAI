/**
 * validate.middleware.js — Generic Joi validation middleware
 *
 * Validates req.body, req.query, or req.params against a Joi schema definition.
 * On error, returns a 400 Bad Request with formatted details.
 */

import Joi from 'joi';
import ApiError from '../utils/ApiError.js';

export const validate = (schema) => (req, _res, next) => {
    // If the schema itself is a Joi object (e.g. schema.isJoi), validate req.body
    if (Joi.isSchema(schema)) {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) {
            const errorMessage = error.details.map((d) => d.message).join(', ');
            return next(new ApiError(400, errorMessage));
        }
        req.body = value;
        return next();
    }

    // Otherwise, handle schema object with keys: body, query, params
    const validSchemaKeys = ['body', 'query', 'params'];
    const objectToValidate = {};
    const schemaToCompile = {};

    for (const key of validSchemaKeys) {
        if (schema[key]) {
            objectToValidate[key] = req[key] || {};
            schemaToCompile[key] = schema[key];
        }
    }

    // If schema directly provides fields without { body: ... }, treat schema as body schema
    if (Object.keys(schemaToCompile).length === 0 && typeof schema === 'object') {
        const { error, value } = Joi.object(schema).validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) {
            const errorMessage = error.details.map((d) => d.message).join(', ');
            return next(new ApiError(400, errorMessage));
        }
        req.body = value;
        return next();
    }

    const compiledSchema = Joi.object(schemaToCompile);
    const { error, value } = compiledSchema.validate(objectToValidate, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        const errorMessage = error.details.map((d) => d.message).join(', ');
        return next(new ApiError(400, errorMessage));
    }

    // Assign sanitized/coerced values back to request
    for (const key of validSchemaKeys) {
        if (value && value[key]) {
            req[key] = value[key];
        }
    }

    next();
};

export default validate;
