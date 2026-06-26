import catchAsync from '../../utils/catchAsync.js';
import authService from './auth.service.js';
import Joi from 'joi';
import validation from './auth.validation.js';
import ApiError from '../../utils/ApiError.js';

const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        const errorMessage = error.details.map((details) => details.message).join(', ');
        return next(new ApiError(400, errorMessage));
    }
    next();
};

const register = catchAsync(async (req, res) => {
    const { user, token } = await authService.registerUser(req.body);
    res.status(201).json({
        success: true,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
        token
    });
});

const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser(email, password);
    res.send({
        success: true,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
        token
    });
});

const getMe = catchAsync(async (req, res) => {
    res.send({
        success: true,
        user: req.user
    });
});


export default {
    register,
    login,
    getMe,
    validate
};
