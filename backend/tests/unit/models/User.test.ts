import { UserModel } from '../../../src/models/User';
import { UserRole } from '../../../src/types';
import { prisma } from '../../../src/config/database';

// Mock Prisma
jest.mock('../../../src/config/database', () => ({
    prisma: {
        user: {
            findMany: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        }
    }
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-123')
}));

describe('UserModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findByEmail', () => {
        it('should return user when found', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashed-password',
                name: 'Test User',
                role: 'developer',
                managedPodIds: ['pod-1'],
                googleId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await UserModel.findByEmail('test@example.com');

            expect(result).not.toBeNull();
            expect(result?.email).toBe('test@example.com');
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' }
            });
        });

        it('should return null when not found', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await UserModel.findByEmail('notfound@example.com');

            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        it('should return user when found', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashed-password',
                name: 'Test User',
                role: 'manager',
                managedPodIds: [],
                googleId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await UserModel.findById('user-1');

            expect(result).not.toBeNull();
            expect(result?.id).toBe('user-1');
        });

        it('should return null when not found', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await UserModel.findById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('findByGoogleId', () => {
        it('should return user when found', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: null,
                name: 'Google User',
                role: 'developer',
                managedPodIds: [],
                googleId: 'google-123',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

            const result = await UserModel.findByGoogleId('google-123');

            expect(result).not.toBeNull();
            expect(result?.googleId).toBe('google-123');
        });

        it('should return null when not found', async () => {
            (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

            const result = await UserModel.findByGoogleId('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('linkGoogle', () => {
        it('should link google account to existing user', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'developer',
                managedPodIds: [],
                googleId: 'google-123',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

            const result = await UserModel.linkGoogle('user-1', 'google-123');

            expect(result).not.toBeNull();
            expect(result?.googleId).toBe('google-123');
        });

        it('should return null when update fails', async () => {
            (prisma.user.update as jest.Mock).mockRejectedValue(new Error('Record not found'));

            const result = await UserModel.linkGoogle('nonexistent', 'google-123');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should create a new user', async () => {
            const mockUser = {
                id: 'test-uuid-123',
                email: 'new@example.com',
                name: 'New User',
                role: 'developer',
                managedPodIds: [],
                googleId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

            const result = await UserModel.create({
                email: 'new@example.com',
                password: 'hashed-password',
                name: 'New User',
                role: UserRole.DEVELOPER
            });

            expect(result.email).toBe('new@example.com');
            expect(prisma.user.create).toHaveBeenCalled();
        });

        it('should create user with defaults (no password, no pods)', async () => {
            const mockUser = {
                id: 'test-uuid-123',
                email: 'new@example.com',
                name: 'New User',
                role: 'developer',
                managedPodIds: [],
                googleId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

            await UserModel.create({
                email: 'new@example.com',
                name: 'New User',
                role: UserRole.DEVELOPER
            });

            expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    password: null,
                    managedPodIds: [],
                    googleId: null
                })
            }));
        });
    });

    describe('update', () => {
        it('should update existing user', async () => {
            const existingUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashed',
                name: 'Old Name',
                role: 'developer',
                managedPodIds: [],
                googleId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const updatedUser = {
                id: 'user-1',
                email: 'test@example.com',
                name: 'New Name',
                role: 'manager',
                managedPodIds: ['pod-1'],
                googleId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
            (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

            const result = await UserModel.update('user-1', {
                name: 'New Name',
                role: UserRole.MANAGER,
                managedPodIds: ['pod-1']
            });

            expect(result).not.toBeNull();
            expect(result?.role).toBe('manager');
        });

        it('should use existing values for missing fields', async () => {
            const existingUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashed',
                name: 'Old Name',
                role: 'developer',
                managedPodIds: ['pod-1'],
                googleId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            // Simulate update result returning new name but keeping old role/pods
            const updatedUser = { ...existingUser, name: 'New Name' };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
            (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

            await UserModel.update('user-1', { name: 'New Name' });

            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: {
                    name: 'New Name',
                    role: 'developer', // Retains existing
                    managedPodIds: ['pod-1'] // Retains existing
                }
            }));
        });

        it('should use existing name when not provided', async () => {
            const existingUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashed',
                name: 'Old Name',
                role: 'developer',
                managedPodIds: ['pod-1'],
                googleId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
            (prisma.user.update as jest.Mock).mockResolvedValue(existingUser);

            await UserModel.update('user-1', { role: UserRole.MANAGER });

            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    name: 'Old Name' // Should retain old name
                })
            }));
        });

        it('should return null if user not found', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await UserModel.update('nonexistent', {});

            expect(result).toBeNull();
        });

        it('should return null on update failure', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1' });
            (prisma.user.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

            const result = await UserModel.update('user-1', { name: 'New Name' });

            expect(result).toBeNull();
        });
    });
    describe('findAll', () => {
        it('should return all users with pagination', async () => {
            const mockUsers = [
                {
                    id: 'user-1',
                    email: 'test@example.com',
                    password: 'hashed',
                    name: 'Test User',
                    role: 'developer',
                    managedPodIds: [],
                    googleId: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];
            (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
            (prisma.user.count as jest.Mock).mockResolvedValue(1);

            const result = await UserModel.findAll({ page: 1, limit: 10 });

            expect(result.users).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.users[0]).not.toHaveProperty('password');
        });

        it('should handle missing managedPodIds from DB', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashed',
                name: 'Test User',
                role: 'developer',
                managedPodIds: null, // Simulate null from DB
                googleId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
            (prisma.user.count as jest.Mock).mockResolvedValue(1);

            const result = await UserModel.findAll();

            expect(result.users[0].managedPodIds).toEqual([]);
        });

        it('should use default options when none provided', async () => {
            (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.user.count as jest.Mock).mockResolvedValue(0);

            await UserModel.findAll();

            expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
                take: 20,
                skip: 0,
                where: {}
            }));
        });

        it('should filter by search term', async () => {
            (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.user.count as jest.Mock).mockResolvedValue(0);

            await UserModel.findAll({ search: 'test' });

            expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    OR: expect.arrayContaining([
                        { name: { contains: 'test', mode: 'insensitive' } },
                        { email: { contains: 'test', mode: 'insensitive' } }
                    ])
                })
            }));
        });
    });

    describe('findByIdSafe', () => {
        it('should return safe user when found', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashed',
                name: 'Test User',
                role: 'developer',
                managedPodIds: [],
                googleId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await UserModel.findByIdSafe('user-1');

            expect(result).not.toBeNull();
            expect(result).not.toHaveProperty('password');
            expect(result?.email).toBe('test@example.com');
        });

        it('should return null when not found', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await UserModel.findByIdSafe('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('updatePassword', () => {
        it('should update password and return true', async () => {
            (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user-1' });

            const result = await UserModel.updatePassword('user-1', 'new-hashed-password');

            expect(result).toBe(true);
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: { password: 'new-hashed-password' }
            });
        });

        it('should return false on failure', async () => {
            (prisma.user.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

            const result = await UserModel.updatePassword('user-1', 'new-hashed-password');

            expect(result).toBe(false);
        });
    });

    describe('delete', () => {
        it('should delete user and return true', async () => {
            (prisma.user.delete as jest.Mock).mockResolvedValue({ id: 'user-1' });

            const result = await UserModel.delete('user-1');

            expect(result).toBe(true);
            expect(prisma.user.delete).toHaveBeenCalledWith({
                where: { id: 'user-1' }
            });
        });

        it('should return false on failure', async () => {
            (prisma.user.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));

            const result = await UserModel.delete('user-1');

            expect(result).toBe(false);
        });
    });
});
