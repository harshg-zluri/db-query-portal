
import fs from 'fs';
import path from 'path';
import { getPool, closePool } from '../src/config/database';

async function applySeed() {
    try {
        const sqlPath = path.join(__dirname, 'seed_demo.sql');
        console.log(`Reading SQL seed from: ${sqlPath}`);

        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Executing SQL seed...');

        const pool = getPool();
        await pool.query(sql);

        console.log('Seed data applied successfully!');
    } catch (error) {
        console.error('Error applying seed data:', error);
        process.exit(1);
    } finally {
        await closePool();
    }
}

applySeed();
