/**
 * MongoDB Test Script
 * 
 * Target: 'prod-mongodb-main' (ID: cccc1111-cccc-1111-cccc-111111111111)
 * Database: 'zluri_main'
 * 
 * Uses the injected MONGODB_URL to connect and execute a query.
 */

const { MongoClient } = require('mongodb');

// Note: The system injects 'MONGODB_URL' (mapped from TARGET_MONGODB_URL)
const url = process.env.MONGODB_URL;
const dbName = process.env.DB_NAME;

const client = new MongoClient(url);

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();

        console.log(`Connected! Using database: ${dbName}`);
        const db = client.db(dbName);

        console.log('Fetching users from zluri_main.users...');
        const users = await db.collection('users').find({}).limit(5).toArray();

        console.log(`Found ${users.length} users:`);
        console.table(users.map(u => ({ id: u._id, name: u.name, dept: u.department })));

    } catch (err) {
        console.error('Mongo Error:', err);
    } finally {
        await client.close();
    }
}

run();
