/**
 * mongo.js — MongoDB / Mongoose connection
 *
 * - Reads MONGO_URI from env (supports Atlas SRV strings and local URIs)
 * - Soft failure: if MONGO_URI is absent the server still boots; chat features degrade gracefully
 * - Mongoose 7+ removes deprecated options (useNewUrlParser / useUnifiedTopology)
 */

import mongoose from 'mongoose';
import config from './env.js';

const connectMongo = async () => {
    if (!config.mongoUri) {
        console.warn('⚠️  MONGO_URI not set — skipping MongoDB connection. Chat features unavailable.');
        return;
    }

    try {
        await mongoose.connect(config.mongoUri, {
            dbName: 'ats_logs', // explicit DB name even when URI already has one
        });
        console.log('🍃 MongoDB connected successfully');

        // Surface connection errors after initial connect
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB runtime error:', err.message);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected');
        });
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        // Non-fatal — server continues; chat transcript writes will throw per-request
        console.warn('⚠️  Server will continue without MongoDB.');
    }
};

export default connectMongo;
