/**
 * PostgreSQL Test Script
 * 
 * Target: 'prod-postgres-primary' (ID: bbbb1111-bbbb-1111-bbbb-111111111111)
 * Database: 'zluri_app'
 * 
 * Uses the injected POSTGRES_URL to connect and execute a query.
 * The environment variables are passed by the ScriptExecutor.
 */

const { Client } = require('pg');

// Note: The system injects 'POSTGRES_URL' (mapped from TARGET_POSTGRES_URL)
let connectionString = process.env.POSTGRES_URL;
// Strip sslmode=require to ensure our config takes precedence
if (connectionString) {
    connectionString = connectionString.replace('sslmode=require', '');
    connectionString = connectionString.replace('?&', '?');
    connectionString = connectionString.replace('&&', '&');
}

const client = new Client({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function run() {
    try {
        console.log('Connecting to PostgreSQL...');
        await client.connect();

        console.log('Connected! Executing query on zluri_app.employees...');
        // Execute a query on the seeded table
        const res = await client.query('SELECT * FROM zluri_app.employees LIMIT 5');

        console.log(`Found ${res.rowCount} employees:`);
        console.table(res.rows.map(r => ({ id: r.id, name: r.name, role: r.position })));

    } catch (err) {
        console.error('Postgres Error:', err);
    } finally {
        await client.end();
    }
}

run();
