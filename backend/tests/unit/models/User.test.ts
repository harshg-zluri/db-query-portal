import { UserModel } from '../../../src/models/User';
import { UserRole } from '../../../src/types';

// Mock database query
jest.mock('../../../src/config/database', () => ({
    query: jest.fn(),
    withTransaction: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-123')
}));

import { query } from '../../../src/config/database';

describe('UserModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findByEmail', () => {
        it('should return user when found', async () => {
            const mockRow = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashed-password',
                name: 'Test User',
                role: 'developer',
                managed_pod_ids: ['pod-1'],
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            };
            (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

            const result = await UserModel.findByEmail('test@example.com');

            expect(result).not.toBeNull();
            expect(result?.email).toBe('test@example.com');
            expect(result?.role).toBe('developer');
            expect(result?.managedPodIds).toEqual(['pod-1']);
        });

        it('should return null when not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await UserModel.findByEmail('notfound@example.com');

            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        it('should return user when found', async () => {
            const mockRow = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashed-password',
                name: 'Test User',
                role: 'manager',
                managed_pod_ids: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            };
            (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

            const result = await UserModel.findById('user-1');

            expect(result).not.toBeNull();
            expect(result?.id).toBe('user-1');
            expect(result?.managedPodIds).toEqual([]);
        });

        it('should return null when not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await UserModel.findById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('findByGoogleId', () => {
        it('should return user when found', async () => {
            const mockRow = {
                id: 'user-1',
                email: 'test@example.com',
                password: null,
                name: 'Google User',
                role: 'developer',
                managed_pod_ids: [],
                google_id: 'google-123',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            };
            (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

            const result = await UserModel.findByGoogleId('google-123');

            expect(result).not.toBeNull();
            expect(result?.googleId).toBe('google-123');
            expect(result?.email).toBe('test@example.com');
        });

        it('should return null when not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await UserModel.findByGoogleId('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('linkGoogle', () => {
        it('should link google account to existing user', async () => {
            const mockRow = {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'developer',
                managed_pod_ids: [],
                google_id: 'google-123',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            };
            (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

            const result = await UserModel.linkGoogle('user-1', 'google-123');

            expect(result).not.toBeNull();
            expect(result?.googleId).toBe('google-123');
        });

        it('should return null when user not found during link', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await UserModel.linkGoogle('nonexistent', 'google-123');

            expect(result).toBeNull();
        });
    });

    describe('findByIdSafe', () => {
        it('should return user without password when found', async () => {
            const mockRow = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'secret-password',
                name: 'Test User',
                role: 'admin',
                managed_pod_ids: [],
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            };
            (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

            const result = await UserModel.findByIdSafe('user-1');

            expect(result).not.toBeNull();
            expect(result?.email).toBe('test@example.com');
            expect((result as any).password).toBeUndefined();
        });

        it('should return null when not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await UserModel.findByIdSafe('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should create a new user', async () => {
            const mockRow = {
                id: 'test-uuid-123',
                email: 'new@example.com',
                name: 'New User',
                role: 'developer',
                managed_pod_ids: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

            const result = await UserModel.create({
                email: 'new@example.com',
                password: 'hashed-password',
                name: 'New User',
                role: UserRole.DEVELOPER
            });

            expect(result.email).toBe('new@example.com');
            expect(result.name).toBe('New User');
            expect(result.role).toBe('developer');
            expect(query).toHaveBeenCalled();
        });

        it('should create user with managedPodIds', async () => {
            const mockRow = {
                id: 'test-uuid-123',
                email: 'manager@example.com',
                name: 'Manager',
                role: 'manager',
                managed_pod_ids: ['pod-1', 'pod-2'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

            const result = await UserModel.create({
                email: 'manager@example.com',
                password: 'hashed-password',
                name: 'Manager',
                role: UserRole.MANAGER,
                managedPodIds: ['pod-1', 'pod-2']
            });

            expect(result.managedPodIds).toEqual(['pod-1', 'pod-2']);
        });

        it('should create user with Google ID', async () => {
            const mockRow = {
                id: 'test-uuid-123',
                email: 'google@example.com',
                name: 'Google User',
                role: 'developer',
                managed_pod_ids: [],
                google_id: 'google-123',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

            const result = await UserModel.create({
                email: 'google@example.com',
                name: 'Google User',
                role: UserRole.DEVELOPER,
                googleId: 'google-123'
            });

            expect(result.googleId).toBe('google-123');
            expect(result.email).toBe('google@example.com');
        });
    });

    describe('update', () => {
        it('should update existing user', async () => {
            // First call for findById
            const existingUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashed',
                name: 'Old Name',
                role: 'developer',
                managed_pod_ids: [],
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            };
            // Second call for update
            const updatedRow = {
                id: 'user-1',
                email: 'test@example.com',
                name: 'New Name',
                role: 'manager',
                managed_pod_ids: ['pod-1'],
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z'
            };

            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [existingUser] })
                .mockResolvedValueOnce({ rows: [updatedRow] });

            const result = await UserModel.update('user-1', {
                name: 'New Name',
                role: UserRole.MANAGER,
                managedPodIds: ['pod-1']
            });

            expect(result).not.toBeNull();
            expect(result?.name).toBe('New Name');
            expect(result?.role).toBe('manager');
        });

        it('should return null when user not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await UserModel.update('nonexistent', { name: 'New Name' });

            expect(result).toBeNull();
        });

        it('should return null when update returns no rows', async () => {
            const existingUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashed',
                name: 'Old Name',
                role: 'developer',
                managed_pod_ids: [],
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            };

            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [existingUser] })  // findById
                .mockResolvedValueOnce({ rows: [] });  // update returns empty

            const result = await UserModel.update('user-1', { name: 'New Name' });

            expect(result).toBeNull();
        });

        it('should use existing values when partial update', async () => {
            const existingUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashed',
                name: 'Existing Name',
                role: 'developer',
                managed_pod_ids: ['pod-1'],
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            };
            const updatedRow = {
                id: 'user-1',
                email: 'test@example.com',
                name: 'New Name',
                role: 'developer',
                managed_pod_ids: ['pod-1'],
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z'
            };

            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [existingUser] })
                .mockResolvedValueOnce({ rows: [updatedRow] });

            const result = await UserModel.update('user-1', { name: 'New Name' });

            expect(result?.name).toBe('New Name');
            expect(result?.role).toBe('developer');  // Unchanged
        });
    });
});
