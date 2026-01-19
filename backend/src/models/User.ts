import { getEm } from '../config/database';
import { User } from '../entities/User';
import { UserRole, SafeUser } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { FilterQuery } from '@mikro-orm/core';

// Transform User entity to SafeUser (no password)
function toSafeUser(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = user;
    return safe;
}

export class UserModel {
    /**
     * Find all users with optional search and pagination
     */
    static async findAll(options: {
        search?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<{ users: SafeUser[]; total: number }> {
        const { search, page = 1, limit = 20 } = options;
        const em = getEm();
        const offset = (page - 1) * limit;

        const where: FilterQuery<User> = {};
        if (search) {
            where.$or = [
                { name: { $ilike: `%${search}%` } },
                { email: { $ilike: `%${search}%` } }
            ];
        }

        const [users, total] = await em.findAndCount(User, where, {
            limit,
            offset,
            orderBy: { createdAt: 'DESC' }
        });

        return {
            users: users.map(toSafeUser),
            total
        };
    }

    /**
     * Find user by email
     */
    static async findByEmail(email: string): Promise<User | null> {
        const em = getEm();
        return await em.findOne(User, { email });
    }

    /**
     * Find user by ID
     */
    static async findById(id: string): Promise<User | null> {
        const em = getEm();
        return await em.findOne(User, { id });
    }

    /**
     * Find user by ID and return safe user (no password)
     */
    static async findByIdSafe(id: string): Promise<SafeUser | null> {
        const user = await this.findById(id);
        return user ? toSafeUser(user) : null;
    }

    /**
     * Find user by Google ID
     */
    static async findByGoogleId(googleId: string): Promise<User | null> {
        const em = getEm();
        return await em.findOne(User, { googleId });
    }

    /**
     * Link Google account to existing user
     */
    static async linkGoogle(id: string, googleId: string): Promise<SafeUser | null> {
        const em = getEm();
        const user = await em.findOne(User, { id });

        if (!user) return null;

        user.googleId = googleId;
        user.updatedAt = new Date();
        await em.flush();

        return toSafeUser(user);
    }

    /**
     * Create new user
     */
    static async create(data: {
        email: string;
        password?: string;
        name: string;
        role: UserRole;
        managedPodIds?: string[];
        googleId?: string;
    }): Promise<SafeUser> {
        const em = getEm();
        const user = new User();
        user.email = data.email;
        if (data.password) user.password = data.password;
        user.name = data.name;
        user.role = data.role;
        user.managedPodIds = data.managedPodIds || [];
        if (data.googleId) user.googleId = data.googleId;

        await em.persistAndFlush(user);
        return toSafeUser(user);
    }

    /**
     * Update user
     */
    static async update(id: string, data: {
        name?: string;
        role?: UserRole;
        managedPodIds?: string[];
    }): Promise<SafeUser | null> {
        const em = getEm();
        const user = await em.findOne(User, { id });

        if (!user) return null;

        if (data.name) user.name = data.name;
        if (data.role) user.role = data.role;
        if (data.managedPodIds) user.managedPodIds = data.managedPodIds;
        user.updatedAt = new Date();

        await em.flush();
        return toSafeUser(user);
    }

    /**
     * Update user password
     */
    static async updatePassword(id: string, hashedPassword: string): Promise<boolean> {
        const em = getEm();
        const user = await em.findOne(User, { id });

        if (!user) return false;

        user.password = hashedPassword;
        user.updatedAt = new Date();
        await em.flush();

        return true;
    }

    /**
     * Delete user by ID
     */
    static async delete(id: string): Promise<boolean> {
        const em = getEm();
        const user = await em.findOne(User, { id });

        if (!user) return false;

        await em.removeAndFlush(user);
        return true;
    }
}

