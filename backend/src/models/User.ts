import { query } from '../config/database';
import { User, SafeUser, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

// SQL queries
const SQL = {
    findByEmail: `
    SELECT id, email, password, name, role, managed_pod_ids, google_id, created_at, updated_at
    FROM users WHERE email = $1
  `,
    findByGoogleId: `
    SELECT id, email, password, name, role, managed_pod_ids, google_id, created_at, updated_at
    FROM users WHERE google_id = $1
  `,
    findById: `
    SELECT id, email, password, name, role, managed_pod_ids, google_id, created_at, updated_at
    FROM users WHERE id = $1
  `,
    create: `
    INSERT INTO users (id, email, password, name, role, managed_pod_ids, google_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING id, email, name, role, managed_pod_ids, google_id, created_at, updated_at
  `,
    update: `
    UPDATE users SET name = $2, role = $3, managed_pod_ids = $4, updated_at = $5
    WHERE id = $1
    RETURNING id, email, name, role, managed_pod_ids, created_at, updated_at
  `,
    linkGoogle: `
    UPDATE users SET google_id = $2, updated_at = $3
    WHERE id = $1
    RETURNING id, email, name, role, managed_pod_ids, google_id, created_at, updated_at
    `,
    updatePassword: `
    UPDATE users SET password = $2, updated_at = $3
    WHERE id = $1
    RETURNING id
  `,
    delete: `
    DELETE FROM users WHERE id = $1
    RETURNING id
  `,
    findAll: `
    SELECT id, email, name, role, managed_pod_ids, created_at, updated_at
    FROM users
    WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `,
    countAll: `
    SELECT COUNT(*) as total
    FROM users
    WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
  `
};

// Transform database row to User object
function rowToUser(row: Record<string, unknown>): User {
    return {
        id: row.id as string,
        email: row.email as string,
        password: row.password as string, // Can be null now, check types
        name: row.name as string,
        role: row.role as UserRole,
        managedPodIds: (row.managed_pod_ids || []) as string[],
        googleId: row.google_id as string | undefined,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string)
    };
}

// Transform database row to SafeUser (no password)
function rowToSafeUser(row: Record<string, unknown>): SafeUser {
    return {
        id: row.id as string,
        email: row.email as string,
        name: row.name as string,
        role: row.role as UserRole,
        managedPodIds: (row.managed_pod_ids || []) as string[],
        googleId: row.google_id as string | undefined,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string)
    };
}

// Remove password from user
function toSafeUser(user: User): SafeUser {
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
        const { search = null, page = 1, limit = 20 } = options;
        const offset = (page - 1) * limit;

        const [usersResult, countResult] = await Promise.all([
            query<Record<string, unknown>>(SQL.findAll, [search, limit, offset]),
            query<{ total: string }>(SQL.countAll, [search])
        ]);

        return {
            users: usersResult.rows.map(rowToSafeUser),
            total: parseInt(countResult.rows[0]?.total || '0', 10)
        };
    }

    /**
     * Find user by email
     */
    static async findByEmail(email: string): Promise<User | null> {
        const result = await query<Record<string, unknown>>(SQL.findByEmail, [email]);
        if (result.rows.length === 0) {
            return null;
        }
        return rowToUser(result.rows[0]);
    }

    /**
     * Find user by ID
     */
    static async findById(id: string): Promise<User | null> {
        const result = await query<Record<string, unknown>>(SQL.findById, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return rowToUser(result.rows[0]);
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
        const result = await query<Record<string, unknown>>(SQL.findByGoogleId, [googleId]);
        if (result.rows.length === 0) {
            return null;
        }
        return rowToUser(result.rows[0]);
    }

    /**
     * Link Google account to existing user
     */
    static async linkGoogle(id: string, googleId: string): Promise<SafeUser | null> {
        const result = await query<Record<string, unknown>>(SQL.linkGoogle, [
            id,
            googleId,
            new Date()
        ]);

        if (result.rows.length === 0) {
            return null;
        }

        return rowToSafeUser(result.rows[0]);
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
        const id = uuidv4();
        const now = new Date();

        await query<Record<string, unknown>>(SQL.create, [
            id,
            data.email,
            data.password || null,
            data.name,
            data.role,
            data.managedPodIds || [],
            data.googleId || null,
            now
        ]);

        return {
            id,
            email: data.email,
            name: data.name,
            role: data.role,
            managedPodIds: data.managedPodIds || [],
            googleId: data.googleId,
            createdAt: now,
            updatedAt: now
        };
    }

    /**
     * Update user
     */
    static async update(id: string, data: {
        name?: string;
        role?: UserRole;
        managedPodIds?: string[];
    }): Promise<SafeUser | null> {
        const user = await this.findById(id);
        if (!user) {
            return null;
        }

        const result = await query<Record<string, unknown>>(SQL.update, [
            id,
            data.name ?? user.name,
            data.role ?? user.role,
            data.managedPodIds ?? user.managedPodIds,
            new Date()
        ]);

        if (result.rows.length === 0) {
            return null;
        }

        return rowToSafeUser(result.rows[0]);
    }

    /**
     * Update user password
     */
    static async updatePassword(id: string, hashedPassword: string): Promise<boolean> {
        const result = await query<{ id: string }>(SQL.updatePassword, [
            id,
            hashedPassword,
            new Date()
        ]);
        return result.rows.length > 0;
    }

    /**
     * Delete user by ID
     */
    static async delete(id: string): Promise<boolean> {
        const result = await query<{ id: string }>(SQL.delete, [id]);
        return result.rows.length > 0;
    }
}
