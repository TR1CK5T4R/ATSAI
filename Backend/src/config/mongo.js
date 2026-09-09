import mongoose from 'mongoose';
import config from './env.js';

const connectMongo = async () => {
    try {
        if (!config.mongoUri) {
            console.warn('⚠️ MongoDB URI is missing in environment variables. Skipping MongoDB connection.');
            return;
        }
        await mongoose.connect(config.mongoUri);
        console.log('🍃 MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.warn('⚠️  Server will continue without MongoDB. Chat features may be unavailable.');
    }
};

export default connectMongo;
