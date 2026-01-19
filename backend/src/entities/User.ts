import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../types';

@Entity({ tableName: 'users' })
export class User {
    @PrimaryKey({ type: 'uuid' })
    id: string = uuidv4();

    @Property({ unique: true })
    email!: string;

    @Property({ nullable: true })
    password?: string;

    @Property()
    name!: string;

    @Enum(() => UserRole)
    role!: UserRole;

    @Property({ type: 'array' })
    managedPodIds: string[] = [];

    @Property({ nullable: true })
    googleId?: string;

    @Property()
    createdAt: Date = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
