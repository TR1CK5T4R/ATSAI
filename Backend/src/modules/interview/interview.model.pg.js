import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const InterviewSession = sequelize.define('InterviewSession', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id',
        },
    },
    roleApplied: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('ongoing', 'completed'),
        defaultValue: 'ongoing',
    },
    finalScore: {
        type: DataTypes.INTEGER,
        validate: { min: 0, max: 100 },
        allowNull: true,
    },
}, {
    timestamps: true,
});

const SkillScore = sequelize.define('SkillScore', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    sessionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'InterviewSessions',
            key: 'id',
        },
    },
    skillName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    score: {
        type: DataTypes.INTEGER,
        validate: { min: 0, max: 100 },
    },
}, {
    timestamps: false,
});

// Associations
InterviewSession.hasMany(SkillScore, { foreignKey: 'sessionId', as: 'skills' });
SkillScore.belongsTo(InterviewSession, { foreignKey: 'sessionId' });

export { InterviewSession, SkillScore };
