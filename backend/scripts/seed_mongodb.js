// MongoDB Demo Data Seed Script
// Run with: node scripts/seed_mongodb.js

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://harshg_db_user:0xNn0u660PFpRc1a@cluster0.tv6pls6.mongodb.net/';

async function seedMongoDB() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas');

        // =====================
        // zluri_main database
        // =====================
        const mainDb = client.db('zluri_main');

        // Users collection
        await mainDb.collection('users').deleteMany({});
        await mainDb.collection('users').insertMany([
            { _id: 'user_001', name: 'John Doe', email: 'john.doe@example.com', status: 'active', department: 'Engineering', created_at: new Date('2024-01-15') },
            { _id: 'user_002', name: 'Jane Smith', email: 'jane.smith@example.com', status: 'active', department: 'Marketing', created_at: new Date('2024-02-20') },
            { _id: 'user_003', name: 'Bob Wilson', email: 'bob.wilson@example.com', status: 'inactive', department: 'Sales', created_at: new Date('2024-03-10') },
            { _id: 'user_004', name: 'Alice Brown', email: 'alice.brown@example.com', status: 'active', department: 'Engineering', created_at: new Date('2024-04-05') },
            { _id: 'user_005', name: 'Charlie Davis', email: 'charlie.davis@example.com', status: 'active', department: 'HR', created_at: new Date('2024-05-12') },
            { _id: 'user_006', name: 'Eva Martinez', email: 'eva.martinez@example.com', status: 'pending', department: 'Finance', created_at: new Date('2024-06-18') },
            { _id: 'user_007', name: 'David Lee', email: 'david.lee@example.com', status: 'active', department: 'Engineering', created_at: new Date('2024-07-22') },
            { _id: 'user_008', name: 'Grace Kim', email: 'grace.kim@example.com', status: 'active', department: 'Product', created_at: new Date('2024-08-30') }
        ]);
        console.log('Inserted users into zluri_main.users');

        // Products collection
        await mainDb.collection('products').deleteMany({});
        await mainDb.collection('products').insertMany([
            { _id: 'prod_001', name: 'Enterprise SaaS License', category: 'Software', price: 999.99, stock: 100, active: true },
            { _id: 'prod_002', name: 'API Integration Package', category: 'Services', price: 499.99, stock: 50, active: true },
            { _id: 'prod_003', name: 'Data Analytics Module', category: 'Software', price: 299.99, stock: 200, active: true },
            { _id: 'prod_004', name: 'Premium Support Plan', category: 'Services', price: 199.99, stock: null, active: true },
            { _id: 'prod_005', name: 'Legacy System Connector', category: 'Software', price: 149.99, stock: 25, active: false }
        ]);
        console.log('Inserted products into zluri_main.products');

        // =====================
        // zluri_integrations database
        // =====================
        const integrationsDb = client.db('zluri_integrations');

        // Integrations collection
        await integrationsDb.collection('integrations').deleteMany({});
        await integrationsDb.collection('integrations').insertMany([
            { _id: 'int_001', name: 'Slack', type: 'communication', status: 'connected', last_sync: new Date() },
            { _id: 'int_002', name: 'Salesforce', type: 'crm', status: 'connected', last_sync: new Date() },
            { _id: 'int_003', name: 'Jira', type: 'project_management', status: 'connected', last_sync: new Date() },
            { _id: 'int_004', name: 'GitHub', type: 'development', status: 'pending', last_sync: null },
            { _id: 'int_005', name: 'Zendesk', type: 'support', status: 'disconnected', last_sync: new Date('2024-01-01') }
        ]);
        console.log('Inserted integrations into zluri_integrations.integrations');

        // =====================
        // zluri_sessions database
        // =====================
        const sessionsDb = client.db('zluri_sessions');

        // Sessions collection
        await sessionsDb.collection('sessions').deleteMany({});
        await sessionsDb.collection('sessions').insertMany([
            { _id: 'sess_001', user_id: 'user_001', token: 'token_abc123', created_at: new Date(), expires_at: new Date(Date.now() + 86400000) },
            { _id: 'sess_002', user_id: 'user_002', token: 'token_def456', created_at: new Date(), expires_at: new Date(Date.now() + 86400000) },
            { _id: 'sess_003', user_id: 'user_004', token: 'token_ghi789', created_at: new Date(), expires_at: new Date(Date.now() + 86400000) }
        ]);
        console.log('Inserted sessions into zluri_sessions.sessions');

        // =====================
        // zluri_cache database
        // =====================
        const cacheDb = client.db('zluri_cache');

        // Cache collection
        await cacheDb.collection('cache').deleteMany({});
        await cacheDb.collection('cache').insertMany([
            { _id: 'cache_user_stats', data: { total_users: 8, active_users: 6, departments: 6 }, ttl: 3600, updated_at: new Date() },
            { _id: 'cache_product_stats', data: { total_products: 5, active_products: 4 }, ttl: 3600, updated_at: new Date() },
            { _id: 'cache_integration_stats', data: { total_integrations: 5, connected: 3 }, ttl: 1800, updated_at: new Date() }
        ]);
        console.log('Inserted cache entries into zluri_cache.cache');

        // Summary
        console.log('\n=== MongoDB Seeding Complete ===');
        console.log('zluri_main: users (8), products (5)');
        console.log('zluri_integrations: integrations (5)');
        console.log('zluri_sessions: sessions (3)');
        console.log('zluri_cache: cache (3)');

    } catch (error) {
        console.error('Error seeding MongoDB:', error);
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

seedMongoDB();
