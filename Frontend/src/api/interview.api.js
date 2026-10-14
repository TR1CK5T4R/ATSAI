import api from './axios';

export const interviewApi = {
    /** Generates 8 tailored questions from the resume and returns question 1 */
    createInterview: async (resumeId, targetRole) => {
        const response = await api.post('/interview/create', { resumeId, ...(targetRole ? { targetRole } : {}) });
        return response.data;
    },

    /** Returns { reply, kind, questionNumber, totalQuestions, done, latencyMs } */
    submitAnswer: async (interviewId, text) => {
        const response = await api.post(`/interview/${interviewId}/answer`, { text });
        return response.data;
    },

    /** Returns { score, summary, strengths, weaknesses, skillGaps, skillBreakdown } */
    finishInterview: async (interviewId) => {
        const response = await api.post(`/interview/${interviewId}/finish`);
        return response.data;
    },

    /** Returns { interview, report, transcript } */
    getInterview: async (interviewId) => {
        const response = await api.get(`/interview/${interviewId}`);
        return response.data;
    },

    getHistory: async (params = {}) => {
        const response = await api.get('/interview/history', { params });
        return response.data;
    },
};
