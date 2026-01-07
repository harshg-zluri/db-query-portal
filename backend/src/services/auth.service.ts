import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { UserModel } from '../models/User';
import { PodModel } from '../models/Pod';
import { JWTPayload, SafeUser, UserRole } from '../types';
import { AuthenticationError, NotFoundError } from '../utils/errors';

interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}

interface LoginResult {
    user: SafeUser;
    tokens: TokenPair;
}

export class AuthService {
    /**
     * Hash password using bcrypt
     */
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, config.bcrypt.saltRounds);
    }

    /**
     * Compare password with hash
     */
    static async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Generate JWT token pair
     */
    static generateTokens(payload: JWTPayload): TokenPair {
        const accessToken = jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn']
        });

        const refreshToken = jwt.sign(
            { userId: payload.userId, type: 'refresh' },
            config.jwt.secret,
            { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] }
        );

        return {
            accessToken,
            refreshToken,
            expiresIn: config.jwt.expiresIn
        };
    }

    /**
     * Verify access token
     */
    static verifyAccessToken(token: string): JWTPayload {
        return jwt.verify(token, config.jwt.secret) as JWTPayload;
    }

    /**
     * Verify refresh token and return new token pair
     */
    static async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
        try {
            const decoded = jwt.verify(refreshToken, config.jwt.secret) as {
                userId: string;
                type: string;
            };

            if (decoded.type !== 'refresh') {
                throw new AuthenticationError('Invalid refresh token');
            }

            const user = await UserModel.findById(decoded.userId);
            if (!user) {
                throw new AuthenticationError('User not found');
            }

            // Get managed POD IDs
            const managedPodIds = user.role === UserRole.MANAGER
                ? await PodModel.getManagedPodIds(user.email)
                : [];

            const payload: JWTPayload = {
                userId: user.id,
                email: user.email,
                role: user.role,
                managedPodIds: user.managedPodIds.length > 0 ? user.managedPodIds : managedPodIds
            };

            return this.generateTokens(payload);
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new AuthenticationError('Invalid refresh token');
            }
            throw error;
        }
    }

    /**
     * Login user with email and password
     */
    static async login(email: string, password: string): Promise<LoginResult> {
        const user = await UserModel.findByEmail(email);

        if (!user) {
            // Use same error message to prevent user enumeration
            throw new AuthenticationError('Invalid email or password');
        }

        const isValid = await this.comparePassword(password, user.password);

        if (!isValid) {
            throw new AuthenticationError('Invalid email or password');
        }

        // Get managed POD IDs for managers
        const managedPodIds = user.role === UserRole.MANAGER
            ? await PodModel.getManagedPodIds(user.email)
            : [];

        const payload: JWTPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            managedPodIds: user.managedPodIds.length > 0 ? user.managedPodIds : managedPodIds
        };

        const tokens = this.generateTokens(payload);

        // Return safe user (without password)
        const { password: _, ...safeUser } = user;

        return {
            user: safeUser,
            tokens
        };
    }

    /**
     * Get user profile by ID
     */
    static async getProfile(userId: string): Promise<SafeUser> {
        const user = await UserModel.findByIdSafe(userId);

        if (!user) {
            throw new NotFoundError('User');
        }

        return user;
    }
}
