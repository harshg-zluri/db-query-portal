import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from './sidebar';
import { MemoryRouter } from 'react-router-dom';
import { UserRole } from '@/types';

// Hoist mocks
const { useAuthStoreMock } = vi.hoisted(() => {
    return { useAuthStoreMock: vi.fn() };
});

// Mock auth store
vi.mock('@stores/auth-store', () => ({
    useAuthStore: useAuthStoreMock
}));

// Mock routes
vi.mock('@constants/routes', () => ({
    NAV_ITEMS: [
        { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', roles: ['developer', 'manager', 'admin'] },
        { label: 'Submissions', path: '/submissions', icon: 'submissions', roles: ['developer', 'manager'] },
        { label: 'Approvals', path: '/approvals', icon: 'approvals', roles: ['manager', 'admin'] },
        { label: 'Admin', path: '/admin', icon: 'admin', roles: ['admin'] },
        { label: 'Unknown', path: '/unknown', icon: 'unknown', roles: ['developer'] }
    ]
}));

const mockUser = {
    id: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.DEVELOPER,
    managed_pod_ids: [],
    created_at: new Date(),
    updated_at: new Date()
};

describe('Sidebar', () => {
    const renderSidebar = (initialRoute = '/') => {
        render(
            <MemoryRouter initialEntries={[initialRoute]}>
                <Sidebar />
            </MemoryRouter>
        );
    };

    it('renders user info', () => {
        useAuthStoreMock.mockReturnValue({ user: mockUser });
        renderSidebar();
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('T')).toBeInTheDocument(); // Initial
    });

    it('renders accessible nav items for DEVELOPER', () => {
        useAuthStoreMock.mockReturnValue({ user: { ...mockUser, role: UserRole.DEVELOPER } });
        renderSidebar();

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Submissions')).toBeInTheDocument();
        expect(screen.queryByText('Approvals')).not.toBeInTheDocument();
        expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('renders accessible nav items for MANAGER', () => {
        useAuthStoreMock.mockReturnValue({ user: { ...mockUser, role: UserRole.MANAGER } });
        renderSidebar();

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Approvals')).toBeInTheDocument();
        expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('renders accessible nav items for ADMIN', () => {
        useAuthStoreMock.mockReturnValue({ user: { ...mockUser, role: UserRole.ADMIN } });
        renderSidebar();

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Approvals')).toBeInTheDocument();
        expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('renders default icon or null for unknown icon types', () => {
        useAuthStoreMock.mockReturnValue({ user: { ...mockUser, role: UserRole.DEVELOPER } });
        renderSidebar();
        expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('highlights active nav item', () => {
        useAuthStoreMock.mockReturnValue({ user: { ...mockUser, role: UserRole.DEVELOPER } });
        renderSidebar('/dashboard');

        const dashboardLink = screen.getByText('Dashboard').closest('a');
        expect(dashboardLink).toHaveClass('bg-[#FEF34B]');

        const submissionsLink = screen.getByText('Submissions').closest('a');
        expect(submissionsLink).not.toHaveClass('bg-[#FEF34B]');
    });

    it('uses default role when user is undefined', () => {
        useAuthStoreMock.mockReturnValue({ user: undefined });
        renderSidebar();

        // Should default to DEVELOPER role (Dashboard, Submissions, Unknown)
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.queryByText('Approvals')).not.toBeInTheDocument();

        // User info fallback
        expect(screen.getByText('U')).toBeInTheDocument();
    });
});
