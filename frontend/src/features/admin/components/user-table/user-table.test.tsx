import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserTable } from './index';
import { UserRole } from '@/types';

const mockUsers = [
    {
        id: 'u1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        managedPodIds: [],
        createdAt: '',
        updatedAt: '',
    },
    {
        id: 'u2',
        name: 'Manager User',
        email: 'manager@example.com',
        role: UserRole.MANAGER,
        managedPodIds: ['pod1'],
        createdAt: '',
        updatedAt: '',
    },
];

describe('UserTable', () => {
    const defaultProps = {
        users: mockUsers,
        isLoading: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
    };

    it('renders loading state', () => {
        render(<UserTable {...defaultProps} isLoading={true} />);
        // Check for skeleton elements (class or specific skeleton test id if available)
        // SkeletonTable usually renders a table with rows
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        // Just verify it doesn't show the real users
        expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
    });

    it('renders empty state', () => {
        render(<UserTable {...defaultProps} users={[]} />);
        expect(screen.getByText('No Users Found')).toBeInTheDocument();
    });

    it('renders user list correctly', () => {
        render(<UserTable {...defaultProps} />);

        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.getByText('Manager User')).toBeInTheDocument();
        expect(screen.getByText('1 pods')).toBeInTheDocument();
    });

    it('applies correct role badge styles', () => {
        render(<UserTable {...defaultProps} />);

        const adminBadge = screen.getByText('admin').closest('span');
        expect(adminBadge).toHaveClass('bg-[#FEE2E2]'); // Red for admin

        const managerBadge = screen.getByText('manager').closest('span');
        expect(managerBadge).toHaveClass('bg-[#DBEAFE]'); // Blue for manager
    });

    it('handles actions', () => {
        render(<UserTable {...defaultProps} />);

        const editButtons = screen.getAllByTitle('Edit user');
        fireEvent.click(editButtons[0]);
        expect(defaultProps.onEdit).toHaveBeenCalledWith(mockUsers[0]);

        const deleteButtons = screen.getAllByTitle('Delete user');
        fireEvent.click(deleteButtons[0]);
        expect(defaultProps.onDelete).toHaveBeenCalledWith(mockUsers[0]);
    });
});
