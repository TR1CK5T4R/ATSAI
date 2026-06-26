import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

// Create Axios Instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const originalRequest = error.config;

        // Check for 401 Unauthorized (Token Expired/Invalid)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            useAuthStore.getState().logout();
            toast.error('Session expired. Please login again.');
            window.location.href = '/login';
        }

        // Pass specific error message to component catch block
        return Promise.reject(error.response?.data || { message: 'Network Error' });
    }
);

export default api;
