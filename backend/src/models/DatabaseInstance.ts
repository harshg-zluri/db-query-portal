import { prisma } from '../config/database';
import { DatabaseInstance, DatabaseType } from '../types';

// Transform Prisma result to DatabaseInstance object
function toInstance(row: {
    id: string;
    name: string;
    type: string;
    host: string;
    port: number;
    databases: string[];
    createdAt: Date;
}): DatabaseInstance {
    return {
        id: row.id,
        name: row.name,
        type: row.type as DatabaseType,
        host: row.host,
        port: row.port,
        databases: row.databases || [],
        createdAt: row.createdAt
    };
}

export class DatabaseInstanceModel {
    /**
     * Get all database instances
     */
    static async findAll(): Promise<DatabaseInstance[]> {
        const instances = await prisma.databaseInstance.findMany({
            orderBy: { name: 'asc' }
        });

        return instances.map(toInstance);
    }

    /**
     * Find instances by database type
     */
    static async findByType(type: DatabaseType): Promise<DatabaseInstance[]> {
        const instances = await prisma.databaseInstance.findMany({
            where: { type },
            orderBy: { name: 'asc' }
        });

        return instances.map(toInstance);
    }

    /**
     * Find instance by ID
     */
    static async findById(id: string): Promise<DatabaseInstance | null> {
        const instance = await prisma.databaseInstance.findUnique({
            where: { id }
        });

        return instance ? toInstance(instance) : null;
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
        const instance = await prisma.databaseInstance.create({
            data: {
                name: data.name,
                type: data.type,
                host: data.host,
                port: data.port,
                databases: data.databases
            }
        });

        return toInstance(instance);
    }
}
