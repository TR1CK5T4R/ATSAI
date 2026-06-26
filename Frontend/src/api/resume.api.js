import api from './axios';

export const resumeApi = {
    uploadResume: async (formData) => {
        const response = await api.post('/resume/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getMyResume: async () => {
        const response = await api.get('/resume/my');
        return response.data;
    }
};
