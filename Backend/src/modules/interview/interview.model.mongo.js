import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['ai', 'user'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    evaluation: {
        type: Object, // Store AI evaluation of the specific answer
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

const interviewLogSchema = new mongoose.Schema({
    sessionId: {
        type: String, // UUID from PG
        required: true,
        unique: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    roleApplied: {
        type: String,
        required: true,
    },
    messages: [messageSchema],
    overallFeedback: {
        type: Object,
        default: {},
    },
    skillBreakdown: {
        type: Object, // Structured skill analysis
        default: {},
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const InterviewLog = mongoose.model('InterviewLog', interviewLogSchema);

export default InterviewLog;
