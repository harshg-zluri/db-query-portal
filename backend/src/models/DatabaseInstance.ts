import { query } from '../config/database';
import { DatabaseInstance, DatabaseType } from '../types';
import { v4 as uuidv4 } from 'uuid';

// SQL queries
const SQL = {
    findAll: `
    SELECT id, name, type, host, port, databases, created_at
    FROM database_instances
    ORDER BY name
  `,
    findByType: `
    SELECT id, name, type, host, port, databases, created_at
    FROM database_instances
    WHERE type = $1
    ORDER BY name
  `,
    findById: `
    SELECT id, name, type, host, port, databases, created_at
    FROM database_instances
    WHERE id = $1
  `,
    create: `
    INSERT INTO database_instances (id, name, type, host, port, databases, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `
};

function rowToInstance(row: Record<string, unknown>): DatabaseInstance {
    return {
        id: row.id as string,
        name: row.name as string,
        type: row.type as DatabaseType,
        host: row.host as string,
        port: row.port as number,
        databases: (row.databases || []) as string[],
        createdAt: new Date(row.created_at as string)
    };
}

export class DatabaseInstanceModel {
    /**
     * Get all database instances
     */
    static async findAll(): Promise<DatabaseInstance[]> {
        const result = await query<Record<string, unknown>>(SQL.findAll);
        return result.rows.map(rowToInstance);
    }

    /**
     * Find instances by database type
     */
    static async findByType(type: DatabaseType): Promise<DatabaseInstance[]> {
        const result = await query<Record<string, unknown>>(SQL.findByType, [type]);
        return result.rows.map(rowToInstance);
    }

    /**
     * Find instance by ID
     */
    static async findById(id: string): Promise<DatabaseInstance | null> {
        const result = await query<Record<string, unknown>>(SQL.findById, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return rowToInstance(result.rows[0]);
    }

    /**
     * Get databases list for an instance
     */
    static async getDatabases(instanceId: string): Promise<string[]> {
        const instance = await this.findById(instanceId);
        return instance?.databases || [];
    }

    /**
     * Create new database instance (Admin only)
     */
    static async create(data: {
        name: string;
        type: DatabaseType;
        host: string;
        port: number;
        databases: string[];
    }): Promise<DatabaseInstance> {
        const id = uuidv4();
        const now = new Date();

        const result = await query<Record<string, unknown>>(SQL.create, [
            id,
            data.name,
            data.type,
            data.host,
            data.port,
            data.databases,
            now
        ]);

        return rowToInstance(result.rows[0]);
    }
}
