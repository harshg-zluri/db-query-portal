/**
 * Sample Script: Connection Error
 * This script attempts to connect to a non-existent database host to trigger a connection error.
 * It ignores the injected environment variables intentionally.
 */

const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://user:pass@non-existent-host:5432/db'
});

async function run() {
    console.log('Attempting to connect to invalid host...');
    try {
        await client.connect();
    } catch (err) {
        console.error('Expected Connection Error:', err.message);
        // We re-throw to ensure the script exits with error code (if desired), 
        // or just log it to stderr which is now captured.
        throw err;
    } finally {
        await client.end();
    }
}

run();
