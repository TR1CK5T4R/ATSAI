/**
 * database.js — PostgreSQL / Sequelize connection
 *
 * - Reads DATABASE_URL from env (set PG_SSL=true for cloud providers like Render/Supabase)
 * - In development: sync({ alter: true }) keeps schema in sync without dropping data
 * - In production: sync is skipped — use Sequelize migrations instead
 * - Pool settings tuned for a single-process Node app
 */

import { Sequelize } from 'sequelize';
import config from './env.js';

// ── Sequelize instance ────────────────────────────────────────────────────────
const sequelize = new Sequelize(config.postgresUri, {
    dialect: 'postgres',

    // Only log SQL in development
    logging: config.nodeEnv === 'development' ? (msg) => console.log(`[SQL] ${msg}`) : false,

    // SSL: required for Supabase / Render / Heroku Postgres
    dialectOptions: config.pgSsl
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},

    // Connection pool
    pool: {
        max: 10,        // max simultaneous connections
        min: 2,         // keep 2 alive (reduces cold-start latency)
        acquire: 30000, // ms to wait before throwing "connection timeout"
        idle: 10000,    // ms a connection can be idle before release
    },
});

// ── connectDB ─────────────────────────────────────────────────────────────────
/**
 * Authenticates Sequelize and (in dev) syncs all registered models.
 * Call this once on server boot before starting to serve requests.
 */
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('🐘 PostgreSQL connected successfully');

        if (config.nodeEnv === 'development') {
            // alter:true adds new columns / changes types without dropping tables
            await sequelize.sync({ alter: true });
            console.log('✅ Sequelize models synced (alter mode)');
        } else {
            console.log('ℹ️  Production mode — skipping auto-sync. Use migrations.');
        }
    } catch (err) {
        console.error('❌ PostgreSQL connection error:', err.message);
        process.exit(1);
    }
};

export { sequelize, connectDB };
