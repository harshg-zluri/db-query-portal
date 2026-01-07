import { query, withTransaction } from '../config/database';
import { User, SafeUser, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

// SQL queries
const SQL = {
    findByEmail: `
    SELECT id, email, password, name, role, managed_pod_ids, created_at, updated_at
    FROM users WHERE email = $1
  `,
    findById: `
    SELECT id, email, password, name, role, managed_pod_ids, created_at, updated_at
    FROM users WHERE id = $1
  `,
    create: `
    INSERT INTO users (id, email, password, name, role, managed_pod_ids, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
    RETURNING id, email, name, role, managed_pod_ids, created_at, updated_at
  `,
    update: `
    UPDATE users SET name = $2, role = $3, managed_pod_ids = $4, updated_at = $5
    WHERE id = $1
    RETURNING id, email, name, role, managed_pod_ids, created_at, updated_at
  `
};

// Transform database row to User object
function rowToUser(row: Record<string, unknown>): User {
    return {
        id: row.id as string,
        email: row.email as string,
        password: row.password as string,
        name: row.name as string,
        role: row.role as UserRole,
        managedPodIds: (row.managed_pod_ids || []) as string[],
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
     * Create new user
     */
    static async create(data: {
        email: string;
        password: string;
        name: string;
        role: UserRole;
        managedPodIds?: string[];
    }): Promise<SafeUser> {
        const id = uuidv4();
        const now = new Date();

        const result = await query<Record<string, unknown>>(SQL.create, [
            id,
            data.email,
            data.password,
            data.name,
            data.role,
            data.managedPodIds || [],
            now
        ]);

        return {
            id,
            email: data.email,
            name: data.name,
            role: data.role,
            managedPodIds: data.managedPodIds || [],
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

        const row = result.rows[0];
        return {
            id: row.id as string,
            email: row.email as string,
            name: row.name as string,
            role: row.role as UserRole,
            managedPodIds: (row.managed_pod_ids || []) as string[],
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string)
        };
    }
}
