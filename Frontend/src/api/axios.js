/**
 * axios.js — Shared API client
 *
 *  - baseURL from VITE_API_URL (see .env.example)
 *  - Request interceptor attaches the in-memory access token (Bearer)
 *  - Response interceptor: on 401, refreshes the access token ONCE using the
 *    httpOnly refresh cookie, then replays the request. Concurrent 401s share
 *    a single refresh call. If refresh fails, the session is cleared.
 *  - Errors are normalised to `Error` objects with `.status` and `.data`, so
 *    pages can always `toast.error(err.message)`.
 *
 * The auth store wires itself in via configureAuth() — this file never imports
 * the store, which avoids a circular import.
 */

import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // send the httpOnly refresh cookie
    timeout: 60_000,       // AI calls (question generation, evaluation) can take a while
});

let authHandlers = {
    getAccessToken: () => null,
    onRefreshed: () => {},
    onSessionExpired: () => {},
};

/** Called once by the auth store */
export const configureAuth = (handlers) => {
    authHandlers = { ...authHandlers, ...handlers };
};

// Endpoints that must never trigger a refresh-and-retry loop
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshPromise = null;

/**
 * Exchange the refresh cookie for a new access token.
 * Single-flight: parallel callers await the same request.
 * @returns {Promise<{ user, accessToken }>}
 */
export const refreshSession = () => {
    if (!refreshPromise) {
        refreshPromise = axios
            .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true, timeout: 15_000 })
            .then(({ data }) => {
                authHandlers.onRefreshed(data.user, data.accessToken);
                return { user: data.user, accessToken: data.accessToken };
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

/** Normalise any axios error into Error(message) + status + data */
const toApiError = (error) => {
    const { response, code } = error;
    let message = response?.data?.message;
    if (!message) {
        if (code === 'ECONNABORTED') message = 'The request timed out — please try again';
        else if (!response) message = 'Cannot reach the server — check your connection';
        else message = `Request failed (${response.status})`;
    }
    const err = new Error(message);
    err.status = response?.status;
    err.data = response?.data;
    return err;
};

api.interceptors.request.use((config) => {
    const token = authHandlers.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        const isAuthCall = AUTH_PATHS.some((p) => original?.url?.startsWith(p));

        if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
            original._retry = true;
            try {
                const { accessToken } = await refreshSession();
                original.headers.Authorization = `Bearer ${accessToken}`;
                return api(original);
            } catch {
                authHandlers.onSessionExpired();
            }
        }
        return Promise.reject(toApiError(error));
    }
);

export default api;
