import api from './axios';

export const resumeApi = {
    /** multipart field "resume" (PDF/DOCX ≤ 5 MB) → { id, fileUrl, structured } */
    uploadResume: async (formData) => {
        const response = await api.post('/resume/upload', formData);
        return response.data;
    },

    /** Newest first */
    getMyResume: async () => {
        const response = await api.get('/resume/my');
        return response.data;
    },

    getLatestScore: async () => {
        const response = await api.get('/resume/score/latest');
        return response.data;
    },
};
