import { Navigate } from 'react-router-dom';
import { LoginForm } from './components/login-form';
import { useAuthStore } from '@stores/auth-store';
import { ROUTES } from '@constants/routes';

export function AuthPage() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    // Already authenticated, redirect to dashboard
    if (isAuthenticated) {
        return <Navigate to={ROUTES.DASHBOARD} replace />;
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
                        <svg
                            className="w-10 h-10 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-100">Database Query Portal</h1>
                    <p className="text-zinc-500 mt-2">Sign in to access the portal</p>
                </div>

                {/* Login Card */}
                <div className="bg-[#111113] border border-[#27272a] rounded-xl p-6 shadow-xl">
                    <LoginForm />
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-zinc-600 mt-6">
                    Secure database query execution portal
                </p>
            </div>
        </div>
    );
}

export default AuthPage;
