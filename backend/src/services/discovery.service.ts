/**
 * Database Discovery Service
 * Dynamically discovers databases from target PostgreSQL and MongoDB servers
 */

import postgres from 'postgres';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// Simple in-memory cache
interface CacheEntry {
    databases: string[];
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Discovery Service
 * Fetches available databases from target database servers
 */
export class DiscoveryService {
    /**
     * Get databases from PostgreSQL server
     * Uses pg_database system catalog
     */
    static async getPostgresDatabases(connectionUrl: string): Promise<string[]> {
        const cacheKey = `postgres:${connectionUrl}`;

        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            logger.debug('[DISCOVERY] Using cached PostgreSQL databases');
            return cached;
        }

        try {
            const sql = postgres(connectionUrl, {
                max: 1,
                connect_timeout: 5 // 5 seconds timeout
            });

            // Query system catalog for non-template databases
            const result = await sql`
                SELECT datname FROM pg_database 
                WHERE datistemplate = false 
                AND datname NOT IN ('postgres', 'template0', 'template1')
                ORDER BY datname
            `;

            await sql.end();

            const databases = result.map(row => row.datname as string);

            // Cache results
            this.setCache(cacheKey, databases);

            logger.info('[DISCOVERY] Discovered PostgreSQL databases', {
                count: databases.length
            });

            return databases;
        } catch (error) {
            logger.error('[DISCOVERY] Failed to discover PostgreSQL databases', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Get databases from MongoDB server
     * Uses listDatabases admin command
     */
    static async getMongoDatabases(connectionUrl: string): Promise<string[]> {
        const cacheKey = `mongo:${connectionUrl}`;

        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            logger.debug('[DISCOVERY] Using cached MongoDB databases');
            return cached;
        }

        try {
            // Connect to MongoDB with timeout
            const connection = await mongoose.createConnection(connectionUrl, {
                serverSelectionTimeoutMS: 5000 // 5 seconds timeout
            }).asPromise();

            // List databases using admin command
            if (!connection.db) {
                throw new Error('Failed to get MongoDB database connection');
            }
            const adminDb = connection.db.admin();
            const result = await adminDb.listDatabases();

            await connection.close();

            // Filter out system databases
            const databases = result.databases
                .map(db => db.name)
                .filter(name => !['admin', 'config', 'local'].includes(name))
                .sort();

            // Cache results
            this.setCache(cacheKey, databases);

            logger.info('[DISCOVERY] Discovered MongoDB databases', {
                count: databases.length
            });

            return databases;
        } catch (error) {
            logger.error('[DISCOVERY] Failed to discover MongoDB databases', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Get schemas/databases from PostgreSQL (for schema-based access)
     */
    static async getPostgresSchemas(connectionUrl: string): Promise<string[]> {
        const cacheKey = `postgres-schemas:${connectionUrl}`;

        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const sql = postgres(connectionUrl, {
                max: 1,
                connect_timeout: 5 // 5 seconds timeout
            });

            const result = await sql`
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                AND schema_name NOT LIKE 'pg_%'
                ORDER BY schema_name
            `;

            await sql.end();

            const schemas = result.map(row => row.schema_name as string);
            this.setCache(cacheKey, schemas);

            return schemas;
        } catch (error) {
            logger.error('[DISCOVERY] Failed to discover PostgreSQL schemas', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Get from cache if not expired
     */
    private static getFromCache(key: string): string[] | null {
        const entry = cache.get(key);
        if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
            return entry.databases;
        }
        cache.delete(key);
        return null;
    }

    /**
     * Set cache entry
     */
    private static setCache(key: string, databases: string[]): void {
        cache.set(key, {
            databases,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache (useful for testing or manual refresh)
     */
    static clearCache(): void {
        cache.clear();
    }
}
