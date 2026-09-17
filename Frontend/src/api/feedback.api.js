import api from './axios';

/** Reviewer (recruiter/admin) feedback on completed interviews */
export const feedbackApi = {
    /** Creates or updates the caller's feedback → { id, rating, comments, reviewer } */
    add: async ({ interviewId, rating, comments }) => {
        const response = await api.post('/feedback/add', { interviewId, rating, comments });
        return response.data;
    },

    listForInterview: async (interviewId) => {
        const response = await api.get(`/feedback/interview/${interviewId}`);
        return response.data;
    },
};
