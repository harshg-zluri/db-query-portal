import { getEm } from '../config/database';
import { DatabaseInstance } from '../entities/DatabaseInstance';
import { DatabaseType } from '../types';

export class DatabaseInstanceModel {
    /**
     * Get all database instances
     */
    static async findAll(): Promise<DatabaseInstance[]> {
        const em = getEm();
        return await em.find(DatabaseInstance, {}, { orderBy: { name: 'ASC' } });
    }

    /**
     * Find instances by database type
     */
    static async findByType(type: DatabaseType): Promise<DatabaseInstance[]> {
        const em = getEm();
        return await em.find(DatabaseInstance, { type }, { orderBy: { name: 'ASC' } });
    }

    /**
     * Find instance by ID
     */
    static async findById(id: string): Promise<DatabaseInstance | null> {
        const em = getEm();
        return await em.findOne(DatabaseInstance, { id });
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
        const em = getEm();
        const instance = new DatabaseInstance();
        instance.name = data.name;
        instance.type = data.type;
        instance.host = data.host;
        instance.port = data.port;
        instance.databases = data.databases;

        await em.persistAndFlush(instance);
        return instance;
    }
}

