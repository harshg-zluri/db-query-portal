import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../../src/services/auth.service';
import { UserModel } from '../../../src/models/User';
import { PodModel } from '../../../src/models/Pod';
import { config } from '../../../src/config/environment';
import { UserRole } from '../../../src/types';
import { AuthenticationError, NotFoundError } from '../../../src/utils/errors';

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/Pod');
jest.mock('bcrypt');

describe('AuthService', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    describe('hashPassword', () => {
        it('should hash password with bcrypt', async () => {
            const mockHash = '$2b$12$hashedpassword';
            (bcrypt.hash as jest.Mock).mockResolvedValue(mockHash);

            const result = await AuthService.hashPassword('password123');

            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
            expect(result).toBe(mockHash);
        });
    });

    describe('comparePassword', () => {
        it('should return true for matching password', async () => {
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await AuthService.comparePassword('password', 'hash');

            expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hash');
            expect(result).toBe(true);
        });

        it('should return false for non-matching password', async () => {
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            const result = await AuthService.comparePassword('wrong', 'hash');

            expect(result).toBe(false);
        });
    });

    describe('generateTokens', () => {
        it('should generate access and refresh tokens', () => {
            const payload = {
                userId: 'user-123',
                email: 'test@zluri.com',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };

            const tokens = AuthService.generateTokens(payload);
            expect(tokens.accessToken).toBeDefined();
            expect(tokens.refreshToken).toBeDefined();
        });
    });

    describe('verifyAccessToken', () => {
        it('should verify valid token', () => {
            const payload = {
                userId: 'user-123',
                email: 'test@zluri.com',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };
            const token = jwt.sign(payload, config.jwt.secret);

            const result = AuthService.verifyAccessToken(token);

            expect(result.userId).toBe('user-123');
        });
    });

    describe('refreshAccessToken', () => {
        it('should verify refresh token and return new tokens', async () => {
            const refreshToken = 'valid-refresh-token';
            const decoded = { userId: 'user-123', type: 'refresh' };

            jest.spyOn(jwt, 'verify').mockReturnValue(decoded as any);

            const mockUser = {
                id: 'user-123',
                email: 'test@zluri.com',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };

            (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);

            const tokens = await AuthService.refreshAccessToken(refreshToken);

            expect(jwt.verify).toHaveBeenCalledWith(refreshToken, config.jwt.secret);
            expect(UserModel.findById).toHaveBeenCalledWith('user-123');
            expect(tokens.accessToken).toBeDefined();
        });

        it('should throw AuthenticationError for invalid token', async () => {
            const refreshToken = 'invalid-token';
            jest.spyOn(jwt, 'verify').mockImplementation(() => {
                throw new jwt.JsonWebTokenError('invalid token');
            });

            await expect(AuthService.refreshAccessToken(refreshToken))
                .rejects.toThrow(AuthenticationError);
        });

        it('should get managed pods for manager', async () => {
            const refreshToken = 'valid-token';
            const decoded = { userId: 'user-123', type: 'refresh' };
            jest.spyOn(jwt, 'verify').mockReturnValue(decoded as any);

            const mockUser = {
                id: 'user-123',
                email: 'manager@zluri.com',
                role: UserRole.MANAGER,
                managedPodIds: []
            };

            (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
            (PodModel.getManagedPodIds as jest.Mock).mockResolvedValue(['pod-1']);

            const tokens = await AuthService.refreshAccessToken(refreshToken);

            expect(PodModel.getManagedPodIds).toHaveBeenCalledWith('manager@zluri.com');
            expect(tokens.accessToken).toBeDefined();
        });

        it('should use existing managedPodIds if present on user for refresh token', async () => {
            const refreshToken = 'valid-token';
            const decoded = { userId: 'user-123', type: 'refresh' };
            jest.spyOn(jwt, 'verify').mockReturnValue(decoded as any);

            const mockUser = {
                id: 'user-123',
                email: 'manager@zluri.com',
                role: UserRole.MANAGER,
                managedPodIds: ['existing-pod-1', 'existing-pod-2']
            };

            (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
            // PodModel.getManagedPodIds is still called for managers but result is not used
            (PodModel.getManagedPodIds as jest.Mock).mockResolvedValue(['fetched-pod']);

            const tokens = await AuthService.refreshAccessToken(refreshToken);

            // Verify the token contains existing pods, not fetched ones
            const decoded2 = jwt.decode(tokens.accessToken) as any;
            expect(decoded2.managedPodIds).toEqual(['existing-pod-1', 'existing-pod-2']);
        });

        it('should throw AuthenticationError for invalid token type (not refresh)', async () => {
            const token = 'valid-token-but-wrong-type';
            const decoded = { userId: 'user-123', type: 'access' }; // type !== 'refresh'
            jest.spyOn(jwt, 'verify').mockReturnValue(decoded as any);

            await expect(AuthService.refreshAccessToken(token))
                .rejects.toThrow(AuthenticationError);
        });

        it('should throw AuthenticationError when user not found after token verification', async () => {
            const token = 'valid-refresh-token';
            const decoded = { userId: 'deleted-user', type: 'refresh' };
            jest.spyOn(jwt, 'verify').mockReturnValue(decoded as any);
            (UserModel.findById as jest.Mock).mockResolvedValue(null);

            await expect(AuthService.refreshAccessToken(token))
                .rejects.toThrow(AuthenticationError);
        });

        it('should re-throw non-JWT errors', async () => {
            const token = 'valid-token';
            const decoded = { userId: 'user-123', type: 'refresh' };
            jest.spyOn(jwt, 'verify').mockReturnValue(decoded as any);

            const customError = new Error('Database connection failed');
            (UserModel.findById as jest.Mock).mockRejectedValue(customError);

            await expect(AuthService.refreshAccessToken(token))
                .rejects.toThrow('Database connection failed');
        });
    });

    describe('login', () => {
        it('should fail if user has no password (e.g. Google auth only)', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'google@zluri.com',
                // password field missing
                name: 'Google User',
                role: UserRole.DEVELOPER,
                managedPodIds: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            (UserModel.findByEmail as jest.Mock).mockResolvedValue(mockUser);

            await expect(AuthService.login('google@zluri.com', 'password'))
                .rejects.toThrow(AuthenticationError);
        });

        it('should use existing managedPodIds if present on user object', async () => {
            const mockUser = {
                id: 'user-manager',
                email: 'manager@zluri.com',
                password: 'hashedpassword',
                role: UserRole.MANAGER,
                managedPodIds: ['pod-existing'],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            (UserModel.findByEmail as jest.Mock).mockResolvedValue(mockUser);
            // Even if PodModel returns something else, we expect existing ids to be used
            (PodModel.getManagedPodIds as jest.Mock).mockResolvedValue(['pod-fetched']);
            jest.spyOn(AuthService as any, 'comparePassword').mockResolvedValue(true);
            jest.spyOn(AuthService as any, 'generateTokens').mockReturnValue({ accessToken: 'access', refreshToken: 'refresh' });

            await AuthService.login('manager@zluri.com', 'password');

            // Check that generateTokens was called with correct payload using existing ids
            expect(AuthService['generateTokens']).toHaveBeenCalledWith(expect.objectContaining({
                managedPodIds: ['pod-existing']
            }));
        });

        it('should login with valid credentials', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@zluri.com',
                password: 'hashed',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };

            (UserModel.findByEmail as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await AuthService.login('test@zluri.com', 'password');

            expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashed');
            expect(result.user).toEqual(expect.objectContaining({ email: 'test@zluri.com' }));
            expect(result.tokens.accessToken).toBeDefined();
        });

        it('should fail if user not found', async () => {
            (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);

            await expect(AuthService.login('test@zluri.com', 'password'))
                .rejects.toThrow(AuthenticationError);
        });

        it('should fail with invalid password', async () => {
            const mockUser = { id: 'user-123', password: 'hashed', managedPodIds: [] };
            (UserModel.findByEmail as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(AuthService.login('test@zluri.com', 'wrong'))
                .rejects.toThrow(AuthenticationError);
        });

        it('should get managed pods for manager', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'manager@zluri.com',
                password: 'hashed',
                name: 'Manager',
                role: UserRole.MANAGER,
                managedPodIds: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            (UserModel.findByEmail as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (PodModel.getManagedPodIds as jest.Mock).mockResolvedValue(['pod-1']);

            const result = await AuthService.login('manager@zluri.com', 'password');

            expect(PodModel.getManagedPodIds).toHaveBeenCalledWith('manager@zluri.com');
            expect(result.tokens.accessToken).toBeDefined();
        });
    });



    describe('loginOrSignupWithGoogle', () => {
        it('should login existing google user', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'google@example.com',
                name: 'Google User',
                role: UserRole.DEVELOPER,
                managedPodIds: [],
                google_id: 'google-123',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            (UserModel.findByGoogleId as jest.Mock).mockResolvedValue(mockUser);

            const result = await AuthService.loginOrSignupWithGoogle(
                'google@example.com',
                'google-123',
                'Google User'
            );

            expect(result.user.email).toBe('google@example.com');
            expect(result.tokens.accessToken).toBeDefined();
            expect(UserModel.findByGoogleId).toHaveBeenCalledWith('google-123');
        });

        it('should link account if user exists by email', async () => {
            const existingUser = {
                id: 'user-1',
                email: 'existing@example.com',
                name: 'Existing User',
                role: UserRole.MANAGER, // Existing role
                managedPodIds: []
            };

            (UserModel.findByGoogleId as jest.Mock).mockResolvedValue(null);
            (UserModel.findByEmail as jest.Mock).mockResolvedValue(existingUser);
            (UserModel.linkGoogle as jest.Mock).mockResolvedValue({ ...existingUser, google_id: 'google-123' });
            (UserModel.findById as jest.Mock).mockResolvedValue(existingUser); // Fetch full user
            (PodModel.getManagedPodIds as jest.Mock).mockResolvedValue(['pod-1']);

            const result = await AuthService.loginOrSignupWithGoogle(
                'existing@example.com',
                'google-123',
                'Existing User'
            );

            expect(UserModel.linkGoogle).toHaveBeenCalledWith('user-1', 'google-123');
            expect(result.user.role).toBe(UserRole.MANAGER); // Role preserved
            expect(result.tokens.accessToken).toBeDefined();
        });

        it('should create new user if not found', async () => {
            (UserModel.findByGoogleId as jest.Mock).mockResolvedValue(null);
            (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);

            const newUser = {
                id: 'new-user',
                email: 'new@example.com',
                name: 'New User',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };

            (UserModel.create as jest.Mock).mockResolvedValue(newUser); // Return safe user
            (UserModel.findById as jest.Mock).mockResolvedValue(newUser); // Return full user

            const result = await AuthService.loginOrSignupWithGoogle(
                'new@example.com',
                'google-123',
                'New User'
            );

            expect(UserModel.create).toHaveBeenCalledWith({
                email: 'new@example.com',
                name: 'New User',
                role: UserRole.DEVELOPER,
                googleId: 'google-123'
            });
            expect(result.user.role).toBe(UserRole.DEVELOPER);
        });

        it('should throw error if linking fails', async () => {
            const existingUser = {
                id: 'user-1',
                email: 'existing@example.com'
            };
            (UserModel.findByGoogleId as jest.Mock).mockResolvedValue(null);
            (UserModel.findByEmail as jest.Mock).mockResolvedValue(existingUser);
            (UserModel.linkGoogle as jest.Mock).mockResolvedValue(null);

            await expect(AuthService.loginOrSignupWithGoogle(
                'existing@example.com',
                'google-123',
                'Name'
            )).rejects.toThrow('Failed to link account');
        });

        it('should throw NotFoundError if user not found after linking', async () => {
            const existingUser = {
                id: 'user-1',
                email: 'existing@example.com'
            };
            (UserModel.findByGoogleId as jest.Mock).mockResolvedValue(null);
            (UserModel.findByEmail as jest.Mock).mockResolvedValue(existingUser);
            (UserModel.linkGoogle as jest.Mock).mockResolvedValue({ ...existingUser, google_id: 'google-123' });
            (UserModel.findById as jest.Mock).mockResolvedValue(null); // Full user fetch fails

            await expect(AuthService.loginOrSignupWithGoogle(
                'existing@example.com',
                'google-123',
                'Name'
            )).rejects.toThrow(NotFoundError);
        });

        it('should throw NotFoundError if user not found after creation', async () => {
            (UserModel.findByGoogleId as jest.Mock).mockResolvedValue(null);
            (UserModel.findByEmail as jest.Mock).mockResolvedValue(null);
            (UserModel.create as jest.Mock).mockResolvedValue({ id: 'new-user' });
            (UserModel.findById as jest.Mock).mockResolvedValue(null); // Full user fetch fails

            await expect(AuthService.loginOrSignupWithGoogle(
                'new@example.com',
                'google-123',
                'Name'
            )).rejects.toThrow(NotFoundError);
        });

        it('should use existing managedPodIds if present on user object', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'manager@example.com',
                name: 'Manager',
                role: UserRole.MANAGER,
                managedPodIds: ['pod-1', 'pod-2'], // Present on user
                google_id: 'google-123',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            (UserModel.findByGoogleId as jest.Mock).mockResolvedValue(mockUser);

            const result = await AuthService.loginOrSignupWithGoogle(
                'manager@example.com',
                'google-123',
                'Manager'
            );

            // Should NOT call getManagedPodIds as they are already on user
            expect(PodModel.getManagedPodIds).not.toHaveBeenCalled();
            // Verify payload has correct pods
            const decoded = jwt.decode(result.tokens.accessToken) as any;
            expect(decoded.managedPodIds).toEqual(['pod-1', 'pod-2']);
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@zluri.com',
                name: 'Test User',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };

            (UserModel.findByIdSafe as jest.Mock).mockResolvedValue(mockUser);

            const result = await AuthService.getProfile('user-123');

            expect(result.email).toBe('test@zluri.com');
        });

        it('should throw NotFoundError if user not found', async () => {
            (UserModel.findByIdSafe as jest.Mock).mockResolvedValue(null);

            await expect(AuthService.getProfile('invalid'))
                .rejects.toThrow(NotFoundError);
        });
    });

});
