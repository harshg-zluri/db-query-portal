// Route paths
export const ROUTES = {
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
    SUBMISSIONS: '/submissions',
    APPROVALS: '/approvals',
    ADMIN: '/admin',
    REQUEST_DETAIL: (id: string) => `/requests/${id}`,
} as const;

// Navigation items
export const NAV_ITEMS = [
    {
        path: ROUTES.DASHBOARD,
        label: 'Dashboard',
        icon: 'dashboard',
        roles: ['developer', 'manager', 'admin'],
    },
    {
        path: ROUTES.SUBMISSIONS,
        label: 'My Submissions',
        icon: 'submissions',
        roles: ['developer', 'manager', 'admin'],
    },
    {
        path: ROUTES.APPROVALS,
        label: 'Approval Dashboard',
        icon: 'approvals',
        roles: ['manager', 'admin'],
    },
    {
        path: ROUTES.ADMIN,
        label: 'Admin Panel',
        icon: 'admin',
        roles: ['admin'],
    },
] as const;

