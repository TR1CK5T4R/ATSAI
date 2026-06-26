import api from './axios';

export const authApi = {
    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    }
};
