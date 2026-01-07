import { PodModel } from '../../../src/models/Pod';

// Mock the pods config
jest.mock('../../../src/config/pods.json', () => ({
    pods: [
        { id: 'pod-1', name: 'Engineering', managerEmail: 'manager1@example.com' },
        { id: 'pod-2', name: 'Data Science', managerEmail: 'manager2@example.com' },
        { id: 'pod-3', name: 'DevOps', managerEmail: 'manager1@example.com' }
    ]
}), { virtual: true });

describe('PodModel', () => {
    describe('findAll', () => {
        it('should return all pods', async () => {
            const pods = await PodModel.findAll();

            expect(pods).toHaveLength(3);
            expect(pods[0].name).toBe('Engineering');
            expect(pods[1].name).toBe('Data Science');
        });
    });

    describe('findById', () => {
        it('should return pod when found', async () => {
            const pod = await PodModel.findById('pod-1');

            expect(pod).not.toBeNull();
            expect(pod?.name).toBe('Engineering');
            expect(pod?.managerEmail).toBe('manager1@example.com');
        });

        it('should return null when not found', async () => {
            const pod = await PodModel.findById('nonexistent');

            expect(pod).toBeNull();
        });
    });

    describe('findByManagerEmail', () => {
        it('should return pods managed by email', async () => {
            const pods = await PodModel.findByManagerEmail('manager1@example.com');

            expect(pods).toHaveLength(2);
            expect(pods.map(p => p.id)).toContain('pod-1');
            expect(pods.map(p => p.id)).toContain('pod-3');
        });

        it('should return empty array when no pods found', async () => {
            const pods = await PodModel.findByManagerEmail('nobody@example.com');

            expect(pods).toHaveLength(0);
        });
    });

    describe('getManagedPodIds', () => {
        it('should return pod IDs managed by email', async () => {
            const podIds = await PodModel.getManagedPodIds('manager1@example.com');

            expect(podIds).toHaveLength(2);
            expect(podIds).toContain('pod-1');
            expect(podIds).toContain('pod-3');
        });

        it('should return empty array when no managed pods', async () => {
            const podIds = await PodModel.getManagedPodIds('nobody@example.com');

            expect(podIds).toHaveLength(0);
        });
    });
});
