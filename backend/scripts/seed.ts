import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed data for development/testing
 * Run: npx tsx scripts/seed.ts
 */

// Sample users with hashed passwords
// Password for all: "password123"
const PASSWORD_HASH = '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG';

export const seedUsers = [
    {
        id: uuidv4(),
        email: 'developer@zluri.com',
        password: PASSWORD_HASH,
        name: 'Test Developer',
        role: 'developer',
        managed_pod_ids: []
    },
    {
        id: uuidv4(),
        email: 'manager1@zluri.com',
        password: PASSWORD_HASH,
        name: 'Pod 1 Manager',
        role: 'manager',
        managed_pod_ids: ['pod-1']
    },
    {
        id: uuidv4(),
        email: 'de-lead@zluri.com',
        password: PASSWORD_HASH,
        name: 'DE Lead',
        role: 'manager',
        managed_pod_ids: ['de']
    },
    {
        id: uuidv4(),
        email: 'db-admin@zluri.com',
        password: PASSWORD_HASH,
        name: 'DB Admin',
        role: 'manager',
        managed_pod_ids: ['db']
    },
    {
        id: uuidv4(),
        email: 'admin@zluri.com',
        password: PASSWORD_HASH,
        name: 'System Admin',
        role: 'admin',
        managed_pod_ids: []
    }
];

// Sample database instances
export const seedDatabaseInstances = [
    {
        id: uuidv4(),
        name: 'prod-be-app-rds',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        databases: ['zluri_app', 'zluri_analytics', 'zluri_logs']
    },
    {
        id: uuidv4(),
        name: 'Zluri-ProdDB',
        type: 'mongodb',
        host: 'localhost',
        port: 27017,
        databases: ['zluri_main', 'zluri_integrations', 'zluri_cache']
    },
    {
        id: uuidv4(),
        name: 'staging-postgres',
        type: 'postgresql',
        host: 'localhost',
        port: 5433,
        databases: ['staging_app', 'staging_test']
    }
];

// SQL to insert seed data
export function generateSeedSQL(): string {
    const userInserts = seedUsers.map(u =>
        `INSERT INTO users (id, email, password, name, role, managed_pod_ids) VALUES ('${u.id}', '${u.email}', '${u.password}', '${u.name}', '${u.role}', ARRAY[${u.managed_pod_ids.map(p => `'${p}'`).join(',')}]::text[]) ON CONFLICT (email) DO NOTHING;`
    ).join('\n');

    const instanceInserts = seedDatabaseInstances.map(i =>
        `INSERT INTO database_instances (id, name, type, host, port, databases) VALUES ('${i.id}', '${i.name}', '${i.type}', '${i.host}', ${i.port}, ARRAY[${i.databases.map(d => `'${d}'`).join(',')}]::text[]) ON CONFLICT (name) DO NOTHING;`
    ).join('\n');

    return `-- Seed Data\n${userInserts}\n\n${instanceInserts}`;
}

// Print SQL when run directly
if (require.main === module) {
    console.log(generateSeedSQL());
}
