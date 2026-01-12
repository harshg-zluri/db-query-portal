import { query, closePool } from '../config/database';

async function migrate() {
    console.log('Starting OAuth Migration...');

    try {
        // 1. Add google_id column if it doesn't exist
        console.log('Adding google_id column...');
        await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'google_id') THEN 
                    ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE; 
                END IF; 
            END $$;
        `);

        // 2. Make password nullable
        console.log('Making password nullable...');
        await query(`
            ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
        `);

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await closePool();
    }
}

migrate();
