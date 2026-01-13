import { prisma } from '../config/database';
import { User, SafeUser, UserRole } from '../types';

// Transform Prisma result to User object
function toUser(row: {
    id: string;
    email: string;
    password: string | null;
    name: string;
    role: string;
    managedPodIds: string[];
    googleId: string | null;
    createdAt: Date;
    updatedAt: Date;
}): User {
    return {
        id: row.id,
        email: row.email,
        password: row.password || '',
        name: row.name,
        role: row.role as UserRole,
        managedPodIds: row.managedPodIds || [],
        googleId: row.googleId || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}

// Remove password from user
function toSafeUser(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = user;
    return safe;
}

// Transform Prisma result to SafeUser (no password)
function rowToSafeUser(row: {
    id: string;
    email: string;
    name: string;
    role: string;
    managedPodIds: string[];
    googleId: string | null;
    createdAt: Date;
    updatedAt: Date;
}): SafeUser {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role as UserRole,
        managedPodIds: row.managedPodIds || [],
        googleId: row.googleId || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
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
        const skip = (page - 1) * limit;

        const whereClause = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } }
            ]
        } : {};

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    managedPodIds: true,
                    googleId: true,
                    createdAt: true,
                    updatedAt: true
                }
            }),
            prisma.user.count({ where: whereClause })
        ]);

        return {
            users: users.map(rowToSafeUser),
            total
        };
    }

    /**
     * Find user by email
     */
    static async findByEmail(email: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        return user ? toUser(user) : null;
    }

    /**
     * Find user by ID
     */
    static async findById(id: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { id }
        });

        return user ? toUser(user) : null;
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
        const user = await prisma.user.findFirst({
            where: { googleId }
        });

        return user ? toUser(user) : null;
    }

    /**
     * Link Google account to existing user
     */
    static async linkGoogle(id: string, googleId: string): Promise<SafeUser | null> {
        try {
            const user = await prisma.user.update({
                where: { id },
                data: { googleId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    managedPodIds: true,
                    googleId: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            return rowToSafeUser(user);
        } catch {
            return null;
        }
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
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: data.password || null,
                name: data.name,
                role: data.role,
                managedPodIds: data.managedPodIds || [],
                googleId: data.googleId || null
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                managedPodIds: true,
                googleId: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return rowToSafeUser(user);
    }

    /**
     * Update user
     */
    static async update(id: string, data: {
        name?: string;
        role?: UserRole;
        managedPodIds?: string[];
    }): Promise<SafeUser | null> {
        const existingUser = await this.findById(id);
        if (!existingUser) {
            return null;
        }

        try {
            const user = await prisma.user.update({
                where: { id },
                data: {
                    name: data.name ?? existingUser.name,
                    role: data.role ?? existingUser.role,
                    managedPodIds: data.managedPodIds ?? existingUser.managedPodIds
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    managedPodIds: true,
                    googleId: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            return rowToSafeUser(user);
        } catch {
            return null;
        }
    }

    /**
     * Update user password
     */
    static async updatePassword(id: string, hashedPassword: string): Promise<boolean> {
        try {
            await prisma.user.update({
                where: { id },
                data: { password: hashedPassword }
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Delete user by ID
     */
    static async delete(id: string): Promise<boolean> {
        try {
            await prisma.user.delete({
                where: { id }
            });
            return true;
        } catch {
            return false;
        }
    }
}
