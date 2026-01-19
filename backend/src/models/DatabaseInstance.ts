import { getEm } from '../config/database';
import { DatabaseInstance } from '../entities/DatabaseInstance';
import { DatabaseType } from '../types';



/**
 * Get all database instances
 */
export async function findAllInstances(): Promise<DatabaseInstance[]> {
    const em = getEm();
    return await em.find(DatabaseInstance, {}, { orderBy: { name: 'ASC' } });
}

/**
 * Find instances by database type
 */
export async function findInstancesByType(type: DatabaseType): Promise<DatabaseInstance[]> {
    const em = getEm();
    return await em.find(DatabaseInstance, { type }, { orderBy: { name: 'ASC' } });
}

/**
 * Find instance by ID
 */
export async function findInstanceById(id: string): Promise<DatabaseInstance | null> {
    const em = getEm();
    return await em.findOne(DatabaseInstance, { id });
}

/**
 * Get databases list for an instance
 */
export async function getInstanceDatabases(instanceId: string): Promise<string[]> {
    const instance = await findInstanceById(instanceId);
    return instance?.databases || [];
}

/**
 * Create new database instance (Admin only)
 */
export async function createInstance(data: {
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


