import api from './axios';

export const coursesApi = {
    /** Top 5 courses for a finished interview's skill gaps, each with a "why" line */
    getRecommendations: async (interviewId) => {
        const response = await api.get(`/courses/recommend/${interviewId}`);
        return response.data;
    },

    getAllCourses: async (params = {}) => {
        const response = await api.get('/courses', { params });
        return response.data;
    },

    /** Returns a payment session { paymentLink, amount, currency, ... } (mock provider for now) */
    checkout: async (courseId) => {
        const response = await api.post(`/courses/${courseId}/checkout`);
        return response.data;
    },
};
