import { Navigate } from 'react-router-dom';
import { LoginForm } from './components/login-form';
import { useAuthStore } from '@stores/auth-store';
import { ROUTES } from '@constants/routes';
import { Button } from '@components/button';
import { API_BASE_URL } from '@queries/api-client';

export function AuthPage() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to={ROUTES.DASHBOARD} replace />;
    }

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-10 h-10 bg-zinc-900 rounded-lg mb-4">
                        <svg
                            className="w-5 h-5 text-white"
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
                    <h1 className="text-xl font-semibold text-zinc-900">
                        DB Query Portal
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">Sign in to your account</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-lg p-6 border border-zinc-200 shadow-sm">
                    <LoginForm />

                    <div className="mt-5 pt-5 border-t border-zinc-200">
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full flex items-center justify-center gap-2"
                            onClick={() => window.location.href = `${API_BASE_URL}/auth/google`}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continue with Google
                        </Button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-zinc-400 mt-6">
                    Secure access to database query execution
                </p>
            </div>
        </div>
    );
}

export default AuthPage;
