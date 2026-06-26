import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET'
];

const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
}

export default {
    port: process.env.PORT || 3001,
    mongoUri: process.env.MONGO_URI || process.env.MONGO_URL,
    postgresUri: process.env.DATABASE_URL || process.env.POSTGRES_URI,
    jwtSecret: process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV || 'development'
};
