import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth-store';
import { UserRole } from '@/types';
import type { User } from '@/types';

// Mock User
const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.DEVELOPER,
    managedPodIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

describe('useAuthStore', () => {
    beforeEach(() => {
        useAuthStore.getState().logout();
    });

    it('should initialize with default state', () => {
        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.token).toBeNull();
        expect(state.isAuthenticated).toBe(false);
    });

    it('should login successfully', () => {
        useAuthStore.getState().login('token', mockUser);
        const state = useAuthStore.getState();

        expect(state.user).toEqual(mockUser);
        expect(state.token).toBe('token');
        expect(state.isAuthenticated).toBe(true);
    });

    it('should logout successfully', () => {
        useAuthStore.getState().login('token', mockUser);
        useAuthStore.getState().logout();
        const state = useAuthStore.getState();

        expect(state.user).toBeNull();
        expect(state.token).toBeNull();
        expect(state.isAuthenticated).toBe(false);
    });

    it('should set tokens only', () => {
        useAuthStore.getState().setTokens('new-token');
        const state = useAuthStore.getState();

        expect(state.token).toBe('new-token');
        expect(state.user).toBeNull(); // Should not change user
    });

    it('should set user only', () => {
        useAuthStore.getState().setUser(mockUser);
        const state = useAuthStore.getState();

        expect(state.user).toEqual(mockUser);
        expect(state.token).toBeNull(); // Should not change token
    });
});
