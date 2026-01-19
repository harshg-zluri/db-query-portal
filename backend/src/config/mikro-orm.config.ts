import { Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { config } from './environment';
import { User } from '../entities/User';
import { QueryRequest } from '../entities/QueryRequest';
import { DatabaseInstance } from '../entities/DatabaseInstance';

const options: Options<PostgreSqlDriver> = {
    driver: PostgreSqlDriver,
    clientUrl: config.database.url,
    entities: [User, QueryRequest, DatabaseInstance],
    entitiesTs: ['src/entities/**/*.ts'],
    metadataProvider: TsMorphMetadataProvider,
    debug: config.nodeEnv === 'development',
    migrations: {
        path: 'dist/migrations',
        pathTs: 'src/migrations',
    },
    driverOptions: config.database.url.includes('sslmode=require') ? {
        connection: {
            ssl: { rejectUnauthorized: false }
        }
    } : undefined,
};

export default options;
