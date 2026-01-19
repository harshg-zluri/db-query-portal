import { Pod } from '../types';
import podsConfig from '../config/pods.json';

// In-memory POD data from config
const pods: Pod[] = podsConfig.pods.map(p => ({
    id: p.id,
    name: p.name,
    managerEmail: p.managerEmail,
    createdAt: new Date()
}));

/**
 * Get all PODs
 */
export async function findAllPods(): Promise<Pod[]> {
    return pods;
}

/**
 * Find POD by ID
 */
export async function findPodById(id: string): Promise<Pod | null> {
    return pods.find(p => p.id === id) || null;
}

/**
 * Find POD by manager email
 */
export async function findPodByManagerEmail(email: string): Promise<Pod[]> {
    return pods.filter(p => p.managerEmail === email);
}

/**
 * Get POD IDs managed by a user
 */
export async function getManagedPodIds(email: string): Promise<string[]> {
    const managedPods = await findPodByManagerEmail(email);
    return managedPods.map(p => p.id);
}

