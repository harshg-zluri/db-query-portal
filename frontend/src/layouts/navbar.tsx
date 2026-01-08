import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/auth-store';
import { ROUTES } from '@constants/routes';
import { Button } from '@components/button';
import apiClient from '@queries/api-client';
import toast from 'react-hot-toast';

export function Navbar() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch {
            // Ignore logout errors
        } finally {
            logout();
            toast.success('Logged out successfully');
            navigate(ROUTES.LOGIN);
        }
    };

    return (
        <header className="h-16 bg-[#111113] border-b border-[#27272a] flex items-center justify-between px-6">
            <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                    Database Query Portal
                </h2>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-sm text-zinc-100">{user?.name}</p>
                    <p className="text-xs text-zinc-500">{user?.role}</p>
                </div>

                <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                    </svg>
                    Logout
                </Button>
            </div>
        </header>
    );
}
