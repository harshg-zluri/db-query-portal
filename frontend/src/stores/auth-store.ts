import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;

    // Actions
    login: (token: string, refreshToken: string, user: User) => void;
    logout: () => void;
    setTokens: (token: string, refreshToken: string) => void;
    setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,

            login: (token, refreshToken, user) =>
                set({
                    token,
                    refreshToken,
                    user,
                    isAuthenticated: true,
                }),

            logout: () =>
                set({
                    token: null,
                    refreshToken: null,
                    user: null,
                    isAuthenticated: false,
                }),

            setTokens: (token, refreshToken) =>
                set({
                    token,
                    refreshToken,
                }),

            setUser: (user) =>
                set({
                    user,
                }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                token: state.token,
                refreshToken: state.refreshToken,
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
