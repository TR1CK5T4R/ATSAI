import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('🐘 PostgreSQL Connected Successfully');
        // Sync models
        await sequelize.sync({ alter: true });
        console.log('✅ Database Synced');
    } catch (error) {
        console.error('❌ PostgreSQL Connection Error:', error);
        process.exit(1);
    }
};

export { sequelize, connectDB };
