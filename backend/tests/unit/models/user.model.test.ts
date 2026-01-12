import { UserModel } from '../../../src/models/User';
import { query } from '../../../src/config/database';
import { UserRole } from '../../../src/types';

// Mock database query
jest.mock('../../../src/config/database', () => ({
    query: jest.fn()
}));

const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'Test User',
    role: UserRole.DEVELOPER,
    managed_pod_ids: ['pod-1'],
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z'
};

const mockSafeUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.DEVELOPER,
    managedPodIds: ['pod-1'],
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z')
};

describe('UserModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return users with default pagination', async () => {
            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [mockUser] }) // users
                .mockResolvedValueOnce({ rows: [{ total: '1' }] }); // count

            const result = await UserModel.findAll();

            expect(query).toHaveBeenCalledTimes(2);
            expect(result.users).toEqual([mockSafeUser]);
            expect(result.total).toBe(1);
        });

        it('should return users with search and custom options', async () => {
            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: '0' }] });

            await UserModel.findAll({ search: 'test', page: 2, limit: 10 });

            expect(query).toHaveBeenNthCalledWith(1, expect.any(String), ['test', 10, 10]);
            expect(query).toHaveBeenNthCalledWith(2, expect.any(String), ['test']);
        });

        it('should handle zero count', async () => {
            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] }); // No total row

            const result = await UserModel.findAll();
            expect(result.total).toBe(0);
        });
    });

    describe('findByEmail', () => {
        it('should return user when found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
            const user = await UserModel.findByEmail('test@example.com');
            expect(user).toEqual(expect.objectContaining({ email: 'test@example.com' }));
        });

        it('should return null when not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });
            const user = await UserModel.findByEmail('missing@example.com');
            expect(user).toBeNull();
        });
    });

    describe('findById', () => {
        it('should return user when found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
            const user = await UserModel.findById('user-1');
            expect(user).toEqual(expect.objectContaining({ id: 'user-1' }));
        });

        it('should return null when not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });
            const user = await UserModel.findById('missing-1');
            expect(user).toBeNull();
        });
    });

    describe('findByIdSafe', () => {
        it('should return safe user when found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
            const user = await UserModel.findByIdSafe('user-1');
            expect(user).toEqual(mockSafeUser);
            expect(user).not.toHaveProperty('password');
        });

        it('should return null when not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });
            const user = await UserModel.findByIdSafe('missing-1');
            expect(user).toBeNull();
        });
    });

    describe('create', () => {
        it('should create and return safe user', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] }); // Insert returns nothing in mock but we rely on data passed

            const newUser = {
                email: 'new@example.com',
                password: 'pwd',
                name: 'New',
                role: UserRole.DEVELOPER
            };

            const result = await UserModel.create(newUser);

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO users'),
                expect.arrayContaining(['new@example.com', 'pwd', 'New', 'developer'])
            );
            expect(result.email).toBe(newUser.email);
            expect(result.managedPodIds).toEqual([]);
        });

        it('should handle provided managedPodIds', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const newUser = {
                email: 'new2@example.com',
                password: 'pwd',
                name: 'New2',
                role: UserRole.MANAGER,
                managedPodIds: ['p1']
            };

            const result = await UserModel.create(newUser);
            expect(result.managedPodIds).toEqual(['p1']);
        });
    });

    describe('update', () => {
        it('should return null if user not found', async () => {
            (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // findById

            const result = await UserModel.update('u-1', { name: 'Updated' });
            expect(result).toBeNull();
        });

        it('should update user and return new data', async () => {
            (query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] }); // findById
            (query as jest.Mock).mockResolvedValueOnce({ rows: [{ ...mockUser, name: 'Updated' }] }); // update

            const result = await UserModel.update('u-1', { name: 'Updated' });
            expect(result?.name).toBe('Updated');
        });

        it('should return null if update fails (e.g. concurrent delete)', async () => {
            (query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] }); // findById
            (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // update returns 0 rows

            const result = await UserModel.update('u-1', { name: 'Updated' });
            expect(result).toBeNull();
        });
    });

    describe('updatePassword', () => {
        it('should return true on success', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'u-1' }] });
            const result = await UserModel.updatePassword('u-1', 'new-hash');
            expect(result).toBe(true);
        });

        it('should return false on failure', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });
            const result = await UserModel.updatePassword('u-1', 'new-hash');
            expect(result).toBe(false);
        });
    });

    describe('delete', () => {
        it('should return true on success', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'u-1' }] });
            const result = await UserModel.delete('u-1');
            expect(result).toBe(true);
        });

        it('should return false on failure', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });
            const result = await UserModel.delete('u-1');
            expect(result).toBe(false);
        });
    });
});
