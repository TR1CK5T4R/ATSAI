const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { AppError } = require('./errorMiddleware');
const User = require('../modules/users/user.model');

const authMiddleware = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);

        const currentUser = await User.findByPk(decoded.id);
        if (!currentUser) {
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        req.user = currentUser;
        next();
    } catch (err) {
        return next(new AppError('Invalid token. Please log in again.', 401));
    }
};

module.exports = authMiddleware;
