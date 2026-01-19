import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import * as AdminController from '../../../src/controllers/admin.controller';
import * as UserModel from '../../../src/models/User';
import * as PodModel from '../../../src/models/Pod';
import { UserRole } from '../../../src/types';
import bcrypt from 'bcrypt';

// Mock models
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/Pod');
jest.mock('bcrypt');

describe('AdminController', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            query: {},
            params: {},
            body: {},
            user: { userId: 'admin-id' }
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
    });

    describe('getUsers', () => {
        it('should get all users with default pagination', async () => {
            (UserModel.findAllUsers as any).mockResolvedValue({
                users: [{ id: '1' }],
                total: 10
            });

            await AdminController.getUsers(mockReq, mockRes, mockNext);

            expect(UserModel.findAllUsers).toHaveBeenCalledWith({
                search: undefined,
                page: 1,
                limit: 20
            });
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                requests: [{ id: '1' }]
            }));
        });

        it('should handle search and pagination', async () => {
            mockReq.query = { page: '2', limit: '5', search: 'alice' };
            (UserModel.findAllUsers as any).mockResolvedValue({ users: [], total: 0 });

            await AdminController.getUsers(mockReq, mockRes, mockNext);

            expect(UserModel.findAllUsers).toHaveBeenCalledWith({
                search: 'alice',
                page: 2,
                limit: 5
            });
        });

        it('should handle errors', async () => {
            const error = new Error('DB Error');
            (UserModel.findAllUsers as any).mockRejectedValue(error);

            await AdminController.getUsers(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getUser', () => {
        it('should get user by ID', async () => {
            mockReq.params.id = 'user-1';
            (UserModel.findUserByIdSafe as any).mockResolvedValue({ id: 'user-1' });

            await AdminController.getUser(mockReq, mockRes, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: { id: 'user-1' } });
        });

        it('should return 404 if not found', async () => {
            mockReq.params.id = 'user-1';
            (UserModel.findUserByIdSafe as any).mockResolvedValue(null);

            await AdminController.getUser(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'User not found' }));
        });

        it('should handle errors', async () => {
            (UserModel.findUserByIdSafe as any).mockRejectedValue(new Error('Err'));
            await AdminController.getUser(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('createUser', () => {
        beforeEach(() => {
            mockReq.body = {
                email: 'new@z.com',
                password: 'pass',
                name: 'New',
                role: UserRole.DEVELOPER
            };
        });

        it('should create user', async () => {
            (UserModel.findUserByEmail as any).mockResolvedValue(null);
            (bcrypt.hash as any).mockResolvedValue('hashed');
            (UserModel.createUser as any).mockResolvedValue({ id: 'new-id' });

            await AdminController.createUser(mockReq, mockRes, mockNext);

            expect(UserModel.createUser).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should fail if email exists', async () => {
            (UserModel.findUserByEmail as any).mockResolvedValue({ id: 'existing' });

            await AdminController.createUser(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Email already registered' }));
        });

        it('should fail if invalid role', async () => {
            mockReq.body.role = 'INVALID';
            (UserModel.findUserByEmail as any).mockResolvedValue(null);

            await AdminController.createUser(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid role' }));
        });

        it('should fail if invalid pods', async () => {
            mockReq.body.managedPodIds = ['pod-1'];
            (UserModel.findUserByEmail as any).mockResolvedValue(null);
            (PodModel.findAllPods as any).mockResolvedValue([{ id: 'pod-2' }]); // valid is pod-2

            await AdminController.createUser(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Invalid pod IDs') }));
        });

        it('should handle errors', async () => {
            (UserModel.findUserByEmail as any).mockRejectedValue(new Error('Err'));
            await AdminController.createUser(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('updateUser', () => {
        beforeEach(() => {
            mockReq.params.id = 'user-1';
            mockReq.body = { name: 'Updated' };
        });

        it('should update user', async () => {
            (UserModel.findUserById as any).mockResolvedValue({ id: 'user-1' });
            (UserModel.updateUser as any).mockResolvedValue({ id: 'user-1', name: 'Updated' });

            await AdminController.updateUser(mockReq, mockRes, mockNext);

            expect(UserModel.updateUser).toHaveBeenCalledWith('user-1', { name: 'Updated', role: undefined, managedPodIds: undefined });
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should update password if provided', async () => {
            mockReq.body.password = 'newpass';
            (UserModel.findUserById as any).mockResolvedValue({ id: 'user-1' });
            (bcrypt.hash as any).mockResolvedValue('hashed');

            await AdminController.updateUser(mockReq, mockRes, mockNext);

            expect(UserModel.updateUserPassword).toHaveBeenCalledWith('user-1', 'hashed');
        });

        it('should fail if user not found', async () => {
            (UserModel.findUserById as any).mockResolvedValue(null);
            await AdminController.updateUser(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should fail if invalid role', async () => {
            mockReq.body.role = 'BAD';
            (UserModel.findUserById as any).mockResolvedValue({ id: 'u' });
            await AdminController.updateUser(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should fail if invalid pods', async () => {
            mockReq.body.managedPodIds = ['bad'];
            (UserModel.findUserById as any).mockResolvedValue({ id: 'u' });
            (PodModel.findAllPods as any).mockResolvedValue([]);
            await AdminController.updateUser(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should handle errors', async () => {
            (UserModel.findUserById as any).mockRejectedValue(new Error('Err'));
            await AdminController.updateUser(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('deleteUser', () => {
        it('should delete user', async () => {
            mockReq.params.id = 'user-2'; // different from admin-id
            (UserModel.findUserById as any).mockResolvedValue({ id: 'user-2' });
            (UserModel.deleteUser as any).mockResolvedValue(true);

            await AdminController.deleteUser(mockReq, mockRes, mockNext);

            expect(UserModel.deleteUser).toHaveBeenCalledWith('user-2');
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should prevent self-deletion', async () => {
            mockReq.params.id = 'admin-id';

            await AdminController.deleteUser(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(UserModel.deleteUser).not.toHaveBeenCalled();
        });

        it('should fail if user not found', async () => {
            mockReq.params.id = 'u2';
            (UserModel.findUserById as any).mockResolvedValue(null);
            await AdminController.deleteUser(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should fail if delete returns false', async () => {
            mockReq.params.id = 'u2';
            (UserModel.findUserById as any).mockResolvedValue({ id: 'u2' });
            (UserModel.deleteUser as any).mockResolvedValue(false);
            await AdminController.deleteUser(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        it('should handle errors', async () => {
            (UserModel.findUserById as any).mockRejectedValue(new Error('Err'));
            await AdminController.deleteUser(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('getPods', () => {
        it('should list pods', async () => {
            (PodModel.findAllPods as any).mockResolvedValue([]);
            await AdminController.getPods(mockReq, mockRes, mockNext);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should handle errors', async () => {
            (PodModel.findAllPods as any).mockRejectedValue(new Error('Err'));
            await AdminController.getPods(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
