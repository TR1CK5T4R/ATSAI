import api from './axios';

export const authApi = {
    /** Returns { user, accessToken } and sets the refresh cookie */
    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    /** role: 'candidate' | 'recruiter' (admins are created server-side) */
    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    /** Clears the refresh cookie */
    logout: async () => {
        const response = await api.post('/auth/logout');
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },
};
