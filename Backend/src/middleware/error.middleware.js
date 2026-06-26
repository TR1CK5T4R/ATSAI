import ApiError from '../utils/ApiError.js';

const errorHandler = (err, req, res, next) => {
    let { statusCode, message } = err;
    if (!err.isOperational) {
        statusCode = err.statusCode || 500;
        message = err.message || 'Internal Server Error';
    }

    const response = {
        code: statusCode,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    };

    if (process.env.NODE_ENV === 'development') {
        console.error(err);
    }

    res.status(statusCode).send(response);
};

export default errorHandler;
