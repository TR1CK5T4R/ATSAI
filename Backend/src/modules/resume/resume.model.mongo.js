import mongoose from 'mongoose';

const resumeAnalysisSchema = new mongoose.Schema({
    userId: {
        type: String, // Storing UUID as String
        required: true,
        index: true,
    },
    rawText: {
        type: String,
        required: true,
    },
    aiStructuredData: {
        type: Object,
        default: {},
    },
    aiSuggestions: {
        type: [String],
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const ResumeAnalysis = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);

export default ResumeAnalysis;
