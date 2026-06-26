import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import errorHandler from './middleware/error.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import resumeRoutes from './modules/resume/resume.routes.js';
import interviewRoutes from './modules/interview/interview.routes.js';
import ApiError from './utils/ApiError.js';

const app = express();

// Set security HTTP headers
app.use(helmet());

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// Enable cors
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allowed origins
        const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];

        if (allowedOrigins.indexOf(origin) === -1) {
            // For development, you might want to allow all:
            // return callback(null, true);

            // But strict check is better:
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Logger
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);

app.get('/', (req, res) => {
    res.send('AI ATS Backend is Running 🚀');
});

// Send back a 404 error for any unknown api request
app.use((req, res, next) => {
    next(new ApiError(404, 'Not found'));
});

// Convert error to ApiError, if needed
app.use((err, req, res, next) => {
    if (!(err instanceof ApiError)) {
        const statusCode = err.statusCode || 500;
        const message = err.message || 'Internal Server Error';
        next(new ApiError(statusCode, message, false, err.stack));
    } else {
        next(err);
    }
});

// Global Error Handler
app.use(errorHandler);

export default app;
