/**
 * useAuthStore.js — Session state (Zustand)
 *
 * Security model:
 *  - The ACCESS token lives in memory only (never localStorage), so an XSS
 *    payload can't read a long-lived credential from storage.
 *  - The REFRESH token is an httpOnly cookie set by the backend.
 *  - Only `user` (name/email/role) is persisted, to know on reload whether a
 *    silent refresh is worth trying.
 *
 * status: 'idle' → 'checking' → 'authenticated' | 'anonymous'
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { configureAuth, refreshSession } from '../api/axios';
import { authApi } from '../api/auth.api';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            status: 'idle',

            /** After login/register/refresh */
            setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),

            clearSession: () => set({ user: null, accessToken: null, status: 'anonymous' }),

            /** On app start: restore the session from the refresh cookie if we had one */
            bootstrap: async () => {
                if (get().status !== 'idle') return;
                if (!get().user) {
                    set({ status: 'anonymous' });
                    return;
                }
                set({ status: 'checking' });
                try {
                    await refreshSession(); // onRefreshed → setSession
                } catch {
                    get().clearSession();
                }
            },

            logout: async () => {
                try {
                    await authApi.logout();
                } catch {
                    // Cookie may already be gone — local logout still proceeds
                }
                get().clearSession();
            },
        }),
        {
            name: 'ats-auth',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ user: state.user }),
        }
    )
);

/** Convenience selectors */
export const selectIsAuthenticated = (s) => s.status === 'authenticated';

// Wire the API client to the store (no circular import: axios.js never imports this file)
configureAuth({
    getAccessToken: () => useAuthStore.getState().accessToken,
    onRefreshed: (user, accessToken) => useAuthStore.getState().setSession(user, accessToken),
    onSessionExpired: () => {
        if (useAuthStore.getState().status === 'authenticated') {
            toast.error('Your session expired — please sign in again');
        }
        useAuthStore.getState().clearSession();
    },
});
