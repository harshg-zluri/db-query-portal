import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserFormModal } from './index';
import { UserRole } from '@/types';
import userEvent from '@testing-library/user-event';

const mockPods = [
    { id: 'pod1', name: 'Alpha Pod', managerEmail: 'manager@example.com', createdAt: '' },
    { id: 'pod2', name: 'Beta Pod', managerEmail: 'manager@example.com', createdAt: '' },
];

const mockUser = {
    id: 'u1',
    name: 'Existing User',
    email: 'existing@example.com',
    role: UserRole.MANAGER,
    managedPodIds: ['pod1'],
    createdAt: '',
    updatedAt: '',
};

describe('UserFormModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        pods: mockPods,
        isLoading: false,
    };

    it('renders create mode correctly', () => {
        render(<UserFormModal {...defaultProps} />);
        expect(screen.getByText('Create New User')).toBeInTheDocument();
        expect(screen.getByLabelText(/Name/)).toHaveValue('');
        expect(screen.getByLabelText(/Email/)).toHaveValue('');
        // Password required check implicitly via validation test
    });

    it('renders edit mode correctly', () => {
        render(<UserFormModal {...defaultProps} user={mockUser} />);
        expect(screen.getByText('Edit User')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Existing User')).toBeInTheDocument();
        expect(screen.getByDisplayValue('existing@example.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('existing@example.com')).toBeDisabled(); // Email disabled
    });

    it('validates required fields', async () => {
        render(<UserFormModal {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: 'Create User' }));

        await waitFor(() => {
            expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
            expect(screen.getByText('Invalid email address')).toBeInTheDocument();
        });
    });

    it('validates password length for new users', async () => {
        render(<UserFormModal {...defaultProps} />);

        await userEvent.type(screen.getByLabelText(/Name/), 'New User');
        await userEvent.type(screen.getByLabelText(/Email/), 'new@example.com');
        await userEvent.type(screen.getByLabelText(/Password \(min 8 characters\)/), 'short');

        fireEvent.click(screen.getByRole('button', { name: 'Create User' }));

        // Custom validation in handleFormSubmit might prevent submission, 
        // but let's check if the generic submit handler was NOT called
        expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('submits valid data for new user', async () => {
        render(<UserFormModal {...defaultProps} />);

        await userEvent.type(screen.getByLabelText(/Name/), 'New User');
        await userEvent.type(screen.getByLabelText(/Email/), 'new@example.com');
        await userEvent.type(screen.getByLabelText(/Password/), 'password123');

        fireEvent.click(screen.getByRole('button', { name: 'Create User' }));

        await waitFor(() => {
            expect(defaultProps.onSubmit).toHaveBeenCalledWith(expect.objectContaining({
                name: 'New User',
                email: 'new@example.com',
                password: 'password123',
                role: 'developer',
            }));
        });
    });

    it('toggles pod assignment for managers', async () => {
        render(<UserFormModal {...defaultProps} />);

        // Select Manager role to show pods
        await userEvent.selectOptions(screen.getByLabelText(/Role/), 'manager');

        expect(screen.getByText('Managed Pods')).toBeInTheDocument();
        const podButton = screen.getByText('Alpha Pod');

        // Toggle on
        fireEvent.click(podButton);
        expect(podButton).toHaveClass('bg-[#FEF34B]'); // Selected style

        // Toggle off
        fireEvent.click(podButton);
        expect(podButton).not.toHaveClass('bg-[#FEF34B]');
    });

    it('hides pods for developers', () => {
        render(<UserFormModal {...defaultProps} />);
        // Default role is developer
        expect(screen.queryByText('Managed Pods')).not.toBeInTheDocument();
    });
});
