import api from './axios';

export const coursesApi = {
    getRecommendations: async (sessionId) => {
        const response = await api.get('/courses/recommendations', { params: { sessionId } });
        return response.data;
    },

    getAllCourses: async () => {
        const response = await api.get('/courses/all');
        return response.data;
    }
};
