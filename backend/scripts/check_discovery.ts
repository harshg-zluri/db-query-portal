
import { DiscoveryService } from '../src/services/discovery.service';
import { config } from '../src/config/environment';

async function checkDiscovery() {
    console.log('Checking Postgres Schemas...');
    try {
        const schemas = await DiscoveryService.getPostgresSchemas(config.targetDatabases.postgresUrl);
        console.log('Postgres Schemas:', schemas);
    } catch (e) {
        console.error('Postgres Discovery Failed:', e);
    }

    console.log('\nChecking MongoDB Databases...');
    try {
        const dbs = await DiscoveryService.getMongoDatabases(config.targetDatabases.mongodbUrl);
        console.log('MongoDB Databases:', dbs);
    } catch (e) {
        console.error('Mongo Discovery Failed:', e);
    }
}

checkDiscovery().then(() => process.exit());
