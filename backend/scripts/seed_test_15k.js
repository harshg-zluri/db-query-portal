// Migration Script: Add 15K test documents for row limit testing
// Run this in MongoDB shell or via mongosh against your target database

// Connect to your target database first: use your_database_name

// Drop collection if exists (for clean test)
// db.test_products.drop();

// Create 15,000 test documents
const docs = [];
const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books'];
const statuses = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'inactive'];

for (let i = 1; i <= 15000; i++) {
    docs.push({
        name: `Product ${i}`,
        description: `Description for product ${i}. This is a test product for row limit testing.`,
        price: parseFloat((Math.random() * 1000).toFixed(2)),
        category: categories[i % 5],
        status: statuses[i % 10],
        tags: [`tag${i % 10}`, `category_${categories[i % 5].toLowerCase().replace(/ & /g, '_')}`],
        createdAt: new Date(),
        metadata: {
            sku: `SKU-${String(i).padStart(6, '0')}`,
            weight: Math.random() * 10,
            inStock: i % 3 !== 0
        }
    });

    // Insert in batches of 1000 to avoid memory issues
    if (docs.length >= 1000) {
        db.test_products.insertMany(docs);
        print(`Inserted ${i} documents...`);
        docs.length = 0; // Clear array
    }
}

// Insert remaining documents
if (docs.length > 0) {
    db.test_products.insertMany(docs);
}

// Verify count
print(`Total documents: ${db.test_products.countDocuments()}`);

// Create index for faster queries
db.test_products.createIndex({ status: 1 });
db.test_products.createIndex({ category: 1 });

print('Migration complete!');

// Sample queries for testing:
// This should PASS (returns ~1,500 inactive products):
// db.test_products.find({ "status": "inactive" })

// This should PASS (returns ~3,000 products per category):
// db.test_products.find({ "category": "Electronics" })

// This should FAIL (returns all 15,000 products, exceeds 10K limit):
// db.test_products.find({})

// This should PASS with filter (returns ~5,000 in-stock electronics):
// db.test_products.find({ "category": "Electronics", "metadata.inStock": true })
