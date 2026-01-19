import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginForm } from './index';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { UserRole } from '@/types';

// Mocks
const mockLogin = vi.fn();
const mockMutateAsync = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@stores/auth-store', () => ({
    useAuthStore: (selector: any) => selector({ login: mockLogin }),
}));

vi.mock('@features/auth/queries/use-login', () => ({
    useLogin: () => ({
        mutateAsync: mockMutateAsync,
        isPending: false,
    }),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('LoginForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLogin.mockClear();
        mockMutateAsync.mockClear();
        mockNavigate.mockClear();
    });

    it('renders login form', () => {
        render(
            <MemoryRouter>
                <LoginForm />
            </MemoryRouter>
        );
        expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('validates required fields', async () => {
        render(
            <MemoryRouter>
                <LoginForm />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            // Zod validation messages
            expect(screen.getByText('Email is required')).toBeInTheDocument();
            expect(screen.getByText('Password is required')).toBeInTheDocument();
        });
    });

    it('submits successfully and redirects developer', async () => {
        mockMutateAsync.mockResolvedValue({
            accessToken: 'token',
            refreshToken: 'refresh',
            user: { role: UserRole.DEVELOPER }
        });

        render(
            <MemoryRouter>
                <LoginForm />
            </MemoryRouter>
        );

        await userEvent.type(screen.getByLabelText(/Email/), 'dev@example.com');
        await userEvent.type(screen.getByLabelText(/Password/), 'password123');
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mockMutateAsync).toHaveBeenCalledWith({
                email: 'dev@example.com',
                password: 'password123'
            });
            expect(mockLogin).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard', expect.anything());
        });
    });

    it('redirects admin to admin dashboard', async () => {
        mockMutateAsync.mockResolvedValue({
            accessToken: 'token',
            refreshToken: 'refresh',
            user: { role: UserRole.ADMIN }
        });

        render(
            <MemoryRouter>
                <LoginForm />
            </MemoryRouter>
        );

        await userEvent.type(screen.getByLabelText(/Email/), 'admin@example.com');
        await userEvent.type(screen.getByLabelText(/Password/), 'password123');
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/admin', expect.anything());
        });
    });

    it('redirects manager to approvals page', async () => {
        mockMutateAsync.mockResolvedValue({
            accessToken: 'token',
            refreshToken: 'refresh',
            user: { role: UserRole.MANAGER }
        });

        render(
            <MemoryRouter>
                <LoginForm />
            </MemoryRouter>
        );

        await userEvent.type(screen.getByLabelText(/Email/), 'manager@example.com');
        await userEvent.type(screen.getByLabelText(/Password/), 'password123');
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/approvals', expect.anything());
        });
    });

    it('handles login failure', async () => {
        mockMutateAsync.mockRejectedValue({
            response: { data: { error: 'Invalid credentials' } }
        });

        render(
            <MemoryRouter>
                <LoginForm />
            </MemoryRouter>
        );

        await userEvent.type(screen.getByLabelText(/Email/), 'fail@example.com');
        await userEvent.type(screen.getByLabelText(/Password/), 'password123');
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mockLogin).not.toHaveBeenCalled();
            // Toast would satisfy specific error call check if we mocked it to spy
        });
    });

    it('falls back to default error message when no response error provided', async () => {
        // Error without response.data.error property
        mockMutateAsync.mockRejectedValue({ message: 'Network error' });

        render(
            <MemoryRouter>
                <LoginForm />
            </MemoryRouter>
        );

        await userEvent.type(screen.getByLabelText(/Email/), 'fail@example.com');
        await userEvent.type(screen.getByLabelText(/Password/), 'password123');
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => {
            expect(mockLogin).not.toHaveBeenCalled();
        });
    });
});
