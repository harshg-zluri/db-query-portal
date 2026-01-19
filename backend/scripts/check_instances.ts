
import { initDatabase } from '../src/config/database';
import { DatabaseInstance } from '../src/entities/DatabaseInstance';
import { DatabaseType } from '../src/types';
import { config } from '../src/config/environment';

async function checkInstances() {
    const orm = await initDatabase();
    const em = orm.em.fork();

    console.log('Checking Database Instances...');
    try {
        const instances = await em.find(DatabaseInstance, {});
        console.log('Found instances:', JSON.stringify(instances, null, 2));

        console.log('\nChecking Config...');
        console.log('Target Postgres URL:', config.targetDatabases.postgresUrl ? 'Set' : 'Missing');
        console.log('Target Mongo URL:', config.targetDatabases.mongodbUrl ? 'Set' : 'Missing');

        // Check enum match
        instances.forEach(inst => {
            console.log(`\nInstance: ${inst.name}`);
            console.log(`Type: '${inst.type}'`);
            console.log(`Matches POSTGRESQL (${DatabaseType.POSTGRESQL})?`, inst.type === DatabaseType.POSTGRESQL);
            console.log(`Matches MONGODB (${DatabaseType.MONGODB})?`, inst.type === DatabaseType.MONGODB);
        });

    } catch (e) {
        console.error('Check failed:', e);
    }
}

checkInstances().then(() => process.exit());
