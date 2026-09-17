import api from './axios';

export const usersApi = {
    /** Recruiter/admin: candidates with interview stats → { total, items } (params: q, limit, offset) */
    listCandidates: async (params = {}) => {
        const response = await api.get('/users/candidates', { params });
        return response.data;
    },
};
