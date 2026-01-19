import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseType } from '../types';

@Entity({ tableName: 'database_instances' })
export class DatabaseInstance {
    @PrimaryKey({ type: 'uuid' })
    id: string = uuidv4();

    @Property()
    name!: string;

    @Enum(() => DatabaseType)
    type!: DatabaseType;

    @Property()
    host!: string;

    @Property()
    port!: number;

    @Property({ type: 'array' })
    databases: string[] = [];

    @Property()
    createdAt: Date = new Date();
}
