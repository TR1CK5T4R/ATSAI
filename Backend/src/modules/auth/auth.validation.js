import Joi from 'joi';

const register = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        email: Joi.string().required().email(),
        password: Joi.string().required().min(6),
        role: Joi.string().valid('candidate', 'admin').default('candidate'),
    }),
};

const login = {
    body: Joi.object().keys({
        email: Joi.string().required(),
        password: Joi.string().required(),
    }),
};

export default {
    register,
    login,
};
