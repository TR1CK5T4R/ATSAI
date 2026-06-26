import ApiError from '../utils/ApiError.js';

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(
                new ApiError(403, `User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route`)
            );
        }
        next();
    };
};

export { authorize };
