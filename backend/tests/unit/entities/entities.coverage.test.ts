import 'reflect-metadata';
import { User } from '../../../src/entities/User';
import { QueryRequest } from '../../../src/entities/QueryRequest';
import { DatabaseInstance } from '../../../src/entities/DatabaseInstance';
import { DatabaseType, SubmissionType, UserRole, RequestStatus } from '../../../src/types';

describe('Entities Coverage', () => {
    it('should instantiate User with defaults', () => {
        const user = new User();
        expect(user.id).toBeDefined();
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
        expect(user.managedPodIds).toEqual([]);

        // Trigger update hook if possible, or just instantiate to cover lines
        user.updatedAt = new Date();
    });

    it('should instantiate QueryRequest with defaults', () => {
        const request = new QueryRequest();
        expect(request.id).toBeDefined();
        expect(request.createdAt).toBeDefined();
        expect(request.updatedAt).toBeDefined();
        expect(request.status).toBe(RequestStatus.PENDING);
        expect(request.isCompressed).toBe(false);
    });

    it('should instantiate DatabaseInstance with defaults', () => {
        const db = new DatabaseInstance();
        expect(db.id).toBeDefined();
        expect(db.createdAt).toBeDefined();
        expect(db.databases).toEqual([]);
    });

    it('should verify Enums are correctly assigned', () => {
        const user = new User();
        user.role = UserRole.ADMIN;
        expect(user.role).toBe(UserRole.ADMIN);

        const request = new QueryRequest();
        request.databaseType = DatabaseType.POSTGRESQL;
        request.submissionType = SubmissionType.QUERY;
        expect(request.databaseType).toBe(DatabaseType.POSTGRESQL);
        expect(request.submissionType).toBe(SubmissionType.QUERY);

        const db = new DatabaseInstance();
        db.type = DatabaseType.MONGODB;
        expect(db.type).toBe(DatabaseType.MONGODB);
    });
});
