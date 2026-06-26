import api from './axios';

export const interviewApi = {
    startInterview: async (roleApplied) => {
        const response = await api.post('/interview/start', { roleApplied });
        return response.data;
    },

    submitAnswer: async (sessionId, answer) => {
        const response = await api.post('/interview/answer', { sessionId, answer });
        return response.data;
    },

    completeInterview: async (sessionId) => {
        const response = await api.post('/interview/complete', { sessionId });
        return response.data;
    },

    getSession: async (sessionId) => {
        const response = await api.get(`/interview/${sessionId}`);
        return response.data;
    }
};
