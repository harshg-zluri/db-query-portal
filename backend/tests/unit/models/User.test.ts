import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { UserModel } from '../../../src/models/User';
import { UserRole } from '../../../src/types';

import { getEm } from '../../../src/config/database';
import { User } from '../../../src/entities/User';

// Mock database
jest.mock('../../../src/config/database');


describe('UserModel', () => {
    let mockEm: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockEm = {
            findOne: jest.fn(),
            find: jest.fn(),
            persistAndFlush: jest.fn(),
            flush: jest.fn(),
            removeAndFlush: jest.fn(),
            findAndCount: jest.fn(),
        };
        (getEm as jest.Mock).mockReturnValue(mockEm);
    });

    describe('findByEmail', () => {
        it('should return user when found', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                role: 'developer',
                managedPodIds: ['pod-1']
            };
            mockEm.findOne.mockResolvedValue(mockUser);

            const result = await UserModel.findByEmail('test@example.com');

            expect(result).not.toBeNull();
            expect(result?.email).toBe('test@example.com');
            expect(mockEm.findOne).toHaveBeenCalledWith(User, { email: 'test@example.com' });
        });

        it('should return null when not found', async () => {
            mockEm.findOne.mockResolvedValue(null);

            const result = await UserModel.findByEmail('notfound@example.com');

            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        it('should return user when found', async () => {
            const mockUser = {
                id: 'user-1',
                managedPodIds: []
            };
            mockEm.findOne.mockResolvedValue(mockUser);

            const result = await UserModel.findById('user-1');

            expect(result).not.toBeNull();
            expect(result?.id).toBe('user-1');
            expect(mockEm.findOne).toHaveBeenCalledWith(User, { id: 'user-1' });
        });
    });

    describe('create', () => {
        it('should create a new user', async () => {
            const data = {
                email: 'new@example.com',
                password: 'hashed-password',
                name: 'New User',
                role: UserRole.DEVELOPER
            };

            const result = await UserModel.create(data);

            expect(mockEm.persistAndFlush).toHaveBeenCalled();
            expect(result.email).toBe('new@example.com');
        });

        it('should create user with googleId', async () => {
            const data = {
                email: 'google@example.com',
                name: 'Google User',
                role: UserRole.DEVELOPER,
                googleId: 'g-123'
            };

            const result = await UserModel.create(data);

            expect(result.googleId).toBe('g-123');
            expect(mockEm.persistAndFlush).toHaveBeenCalledWith(
                expect.objectContaining({ googleId: 'g-123' })
            );
        });
    });

    describe('findAll', () => {
        it('should return paginated users', async () => {
            const mockUsers = [
                { id: 'user-1', toJSON: () => ({ email: 'test@example.com' }) }
            ];
            mockEm.findAndCount.mockResolvedValue([mockUsers, 1]);

            const result = await UserModel.findAll({ page: 1, limit: 10 });

            expect(result.users).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(mockEm.findAndCount).toHaveBeenCalledWith(
                User,
                {},
                { limit: 10, offset: 0, orderBy: { createdAt: 'DESC' } }
            );
        });

        it('should use default pagination options', async () => {
            mockEm.findAndCount.mockResolvedValue([[], 0]);

            await UserModel.findAll();

            expect(mockEm.findAndCount).toHaveBeenCalledWith(
                User,
                {},
                expect.objectContaining({ limit: 20, offset: 0 })
            );
        });

        it('should filter by search term', async () => {
            mockEm.findAndCount.mockResolvedValue([[], 0]);

            await UserModel.findAll({ search: 'test' });

            expect(mockEm.findAndCount).toHaveBeenCalledWith(
                User,
                { $or: [{ name: { $ilike: '%test%' } }, { email: { $ilike: '%test%' } }] },
                expect.any(Object)
            );
        });
    });

    describe('findByIdSafe', () => {
        it('should return safe user (no password)', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'secret',
                toJSON: () => ({ id: 'user-1', email: 'test@example.com' })
            };
            mockEm.findOne.mockResolvedValue(mockUser);

            const result = await UserModel.findByIdSafe('user-1');

            expect(result).not.toBeNull();
            expect(result).not.toHaveProperty('password');
        });

        it('should return null when not found', async () => {
            mockEm.findOne.mockResolvedValue(null);
            const result = await UserModel.findByIdSafe('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('findByGoogleId', () => {
        it('should find user by google id', async () => {
            const mockUser = { id: 'user-1', googleId: 'g-123' };
            mockEm.findOne.mockResolvedValue(mockUser);

            const result = await UserModel.findByGoogleId('g-123');
            expect(result).toEqual(mockUser);
            expect(mockEm.findOne).toHaveBeenCalledWith(User, { googleId: 'g-123' });
        });
    });

    describe('linkGoogle', () => {
        it('should link google id to user', async () => {
            const mockUser = { id: 'user-1' };
            mockEm.findOne.mockResolvedValue(mockUser);

            const result = await UserModel.linkGoogle('user-1', 'g-123');

            expect(mockUser).toHaveProperty('googleId', 'g-123');
            expect(mockEm.flush).toHaveBeenCalled();
            expect(result).not.toBeNull();
        });

        it('should return null if user not found', async () => {
            mockEm.findOne.mockResolvedValue(null);
            const result = await UserModel.linkGoogle('nonexistent', 'g-123');
            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        it('should update user fields', async () => {
            const mockUser = { id: 'user-1', name: 'Old' };
            mockEm.findOne.mockResolvedValue(mockUser);

            const result = await UserModel.update('user-1', { name: 'New' });

            expect(mockUser).toHaveProperty('name', 'New');
            expect(mockEm.flush).toHaveBeenCalled();
            expect(result).not.toBeNull();
        });

        it('should update all optional fields', async () => {
            const mockUser = { id: 'user-1', name: 'Old', role: 'developer', managedPodIds: [] };
            mockEm.findOne.mockResolvedValue(mockUser);

            await UserModel.update('user-1', {
                name: 'New Name',
                role: UserRole.ADMIN,
                managedPodIds: ['pod-1']
            });

            expect(mockUser).toHaveProperty('name', 'New Name');
            expect(mockUser).toHaveProperty('role', UserRole.ADMIN);
            expect(mockUser).toHaveProperty('managedPodIds', ['pod-1']);
        });

        it('should return null if user not found', async () => {
            mockEm.findOne.mockResolvedValue(null);
            const result = await UserModel.update('nonexistent', { name: 'New' });
            expect(result).toBeNull();
        });
    });

    describe('updatePassword', () => {
        it('should update password', async () => {
            const mockUser = { id: 'user-1', password: 'old' };
            mockEm.findOne.mockResolvedValue(mockUser);

            const result = await UserModel.updatePassword('user-1', 'new-hash');

            expect(mockUser).toHaveProperty('password', 'new-hash');
            expect(mockEm.flush).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should return false if user not found', async () => {
            mockEm.findOne.mockResolvedValue(null);
            const result = await UserModel.updatePassword('nonexistent', 'hash');
            expect(result).toBe(false);
        });
    });

    describe('delete', () => {
        it('should remove user', async () => {
            const mockUser = { id: 'user-1' };
            mockEm.findOne.mockResolvedValue(mockUser);

            const result = await UserModel.delete('user-1');

            expect(mockEm.removeAndFlush).toHaveBeenCalledWith(mockUser);
            expect(result).toBe(true);
        });

        it('should return false if user not found', async () => {
            mockEm.findOne.mockResolvedValue(null);
            const result = await UserModel.delete('nonexistent');
            expect(result).toBe(false);
        });
    });
});
