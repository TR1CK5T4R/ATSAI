import jwt from 'jsonwebtoken';
import User from '../modules/auth/auth.model.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';

const protect = catchAsync(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = await User.findByPk(decoded.id, {
                attributes: { exclude: ['password'] },
            });

            if (!req.user) {
                return next(new ApiError(401, 'User not found'));
            }

            next();
        } catch (error) {
            console.error(error);
            return next(new ApiError(401, 'Not authorized, token failed'));
        }
    }

    if (!token) {
        return next(new ApiError(401, 'Not authorized, no token'));
    }
});

export { protect };
