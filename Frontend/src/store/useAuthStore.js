import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            loginAction: (user, token) => {
                set({
                    user,
                    token,
                    isAuthenticated: true
                });
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false
                });
                localStorage.removeItem('auth-storage'); // Optional: Clear persisting storage
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                isAuthenticated: state.isAuthenticated
            }),
        }
    )
);
