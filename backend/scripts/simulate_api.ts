
import { initDatabase } from '../src/config/database';
import { DatabaseInstance } from '../src/entities/DatabaseInstance';
import { DatabaseType } from '../src/types';
import { config } from '../src/config/environment';
import { DiscoveryService } from '../src/services/discovery.service';

async function simulate() {
    console.log('--- Simulating getDatabases Logic ---');
    const orm = await initDatabase();
    const em = orm.em.fork();

    // Fetch a real Postgres instance
    const instances = await em.find(DatabaseInstance, { type: DatabaseType.POSTGRESQL });
    if (instances.length === 0) {
        console.error('No Postgres instances found!');
        return;
    }
    const instance = instances[0];
    console.log(`Testing with Instance: ${instance.name} (${instance.id})`);
    console.log(`Instance Type: ${instance.type}`);
    console.log(`Static Databases: ${instance.databases.join(', ')}`);

    console.log('\n--- Running Discovery Logic ---');
    try {
        let databases: string[] = instance.databases;

        if (instance.type === DatabaseType.POSTGRESQL) {
            const targetUrl = config.targetDatabases.postgresUrl;
            console.log(`Target URL Configured: ${targetUrl ? 'YES' : 'NO'}`);
            if (targetUrl) {
                console.log(`Target URL: ${targetUrl.split('@')[1]}`); // Privacy safe

                console.log('Calling DiscoveryService.getPostgresSchemas...');
                const discovered = await DiscoveryService.getPostgresSchemas(targetUrl);
                console.log(`Discovered Result:`, discovered);

                if (discovered && discovered.length > 0) {
                    databases = discovered;
                    console.log('SUCCESS: Overwrote with dynamic list.');
                } else {
                    console.log('WARN: Discovered list empty/null. Keeping static.');
                }
            } else {
                console.log('WARN: No Target URL found.');
            }
        }

        console.log('\nFinal Database List:', databases);

        if (databases.includes('load_testing')) {
            console.log('\n✅ load_testing FOUND!');
        } else {
            console.log('\n❌ load_testing MISSING!');
        }

    } catch (error) {
        console.error('\n!!! ERROR CAUGHT !!!');
        console.error(error);
    }
}

simulate().then(() => process.exit());
