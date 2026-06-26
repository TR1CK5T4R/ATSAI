import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const Resume = sequelize.define('Resume', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users', // Matches table name from User model
            key: 'id',
        },
    },
    fileUrl: {
        type: DataTypes.STRING,
        allowNull: true, // Nullable if storing raw text only initially
    },
    extractedSkills: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
    },
    experienceLevel: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    resumeScore: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    timestamps: true,
});

export default Resume;
