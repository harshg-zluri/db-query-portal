// Seed 15K test documents to MongoDB
// Run with: npx ts-node scripts/seed_mongo_15k.ts

import { MongoClient } from 'mongodb';

const MONGO_URL = 'mongodb+srv://harshg_db_user:0xNn0u660PFpRc1a@cluster0.tv6pls6.mongodb.net/';
const DB_NAME = 'test_db';

async function seed() {
    const client = new MongoClient(MONGO_URL);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(DB_NAME);
        const collection = db.collection('test_products');

        // Clear existing test data
        await collection.deleteMany({});
        console.log('Cleared existing test_products');

        const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books'];
        const statuses = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'inactive'];

        // Insert in batches of 1000
        for (let batch = 0; batch < 15; batch++) {
            const docs = [];
            for (let i = 1; i <= 1000; i++) {
                const idx = batch * 1000 + i;
                docs.push({
                    name: `Product ${idx}`,
                    description: `Description for product ${idx}. Test product for row limit testing.`,
                    price: parseFloat((Math.random() * 1000).toFixed(2)),
                    category: categories[idx % 5],
                    status: statuses[idx % 10],
                    tags: [`tag${idx % 10}`, `cat_${categories[idx % 5].toLowerCase().replace(/ & /g, '_')}`],
                    createdAt: new Date(),
                    metadata: {
                        sku: `SKU-${String(idx).padStart(6, '0')}`,
                        weight: Math.random() * 10,
                        inStock: idx % 3 !== 0
                    }
                });
            }
            await collection.insertMany(docs);
            console.log(`Inserted batch ${batch + 1}/15 (${(batch + 1) * 1000} documents)`);
        }

        // Create indexes
        await collection.createIndex({ status: 1 });
        await collection.createIndex({ category: 1 });

        const count = await collection.countDocuments();
        console.log(`\nMigration complete! Total documents: ${count}`);

        console.log('\nTest queries:');
        console.log('- db.test_products.find({}) -> FAIL (15K exceeds limit)');
        console.log('- db.test_products.find({"status": "inactive"}) -> PASS (~1.5K)');
        console.log('- db.test_products.find({"category": "Electronics"}) -> PASS (~3K)');

    } finally {
        await client.close();
    }
}

seed().catch(console.error);
