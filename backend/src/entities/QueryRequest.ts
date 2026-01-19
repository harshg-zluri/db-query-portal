import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseType, SubmissionType, RequestStatus } from '../types';

@Entity({ tableName: 'query_requests' })
export class QueryRequest {
    @PrimaryKey({ type: 'uuid' })
    id: string = uuidv4();

    @Property()
    userId!: string;

    @Property()
    userEmail!: string;

    @Enum(() => DatabaseType)
    databaseType!: DatabaseType;

    @Property()
    instanceId!: string;

    @Property()
    instanceName!: string;

    @Property()
    databaseName!: string;

    @Enum(() => SubmissionType)
    submissionType!: SubmissionType;

    @Property({ type: 'text', nullable: true })
    query?: string;

    @Property({ nullable: true })
    scriptFileName?: string;

    @Property({ type: 'text', nullable: true })
    scriptContent?: string;

    @Property({ type: 'text' })
    comments!: string;

    @Property()
    podId!: string;

    @Property()
    podName!: string;

    @Enum(() => RequestStatus)
    status: RequestStatus = RequestStatus.PENDING;

    @Property({ nullable: true })
    approverEmail?: string;

    @Property({ type: 'text', nullable: true })
    rejectionReason?: string;

    @Property({ type: 'text', nullable: true })
    executionResult?: string;

    @Property({ type: 'text', nullable: true })
    executionError?: string;

    @Property()
    isCompressed: boolean = false;

    @Property({ nullable: true })
    executedAt?: Date;

    @Property({ type: 'array', nullable: true })
    warnings?: string[];

    @Property()
    createdAt: Date = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
