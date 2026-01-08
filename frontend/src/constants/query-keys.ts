// React Query keys for cache management
export const queryKeys = {
    // Auth
    profile: ['profile'] as const,

    // Databases
    databaseTypes: ['database-types'] as const,
    instances: (type?: string) => ['instances', type] as const,
    databases: (instanceId: string) => ['databases', instanceId] as const,

    // Pods
    pods: ['pods'] as const,
    pod: (id: string) => ['pods', id] as const,

    // Requests
    myRequests: (page: number, status?: string) => ['my-requests', page, status] as const,
    pendingRequests: (page: number) => ['pending-requests', page] as const,
    allRequests: (page: number, filters?: Record<string, unknown>) => ['requests', page, filters] as const,
    request: (id: string) => ['request', id] as const,
};
