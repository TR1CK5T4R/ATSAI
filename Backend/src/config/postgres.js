const { Sequelize } = require('sequelize');
const config = require('./env');

const sequelize = new Sequelize(config.postgresUri, {
    dialect: 'postgres',
    logging: config.nodeEnv === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

const connectPostgres = async () => {
    try {
        await sequelize.authenticate();
        console.log('🐘 PostgreSQL Connected Successfully');
        // Sync models (use { force: true } only for dev/reset, otherwise { alter: true } or migrations)
        // For now, we use sync to ensure the User table is created
        await sequelize.sync({ alter: true });
    } catch (error) {
        console.error('❌ PostgreSQL Connection Error:', error);
        process.exit(1);
    }
};

module.exports = { sequelize, connectPostgres };
