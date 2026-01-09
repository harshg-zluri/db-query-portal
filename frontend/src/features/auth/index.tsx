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
        <div className="min-h-screen bg-[#F3F0E6] bg-grid flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-slide-up">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FEF34B] border-3 border-black rounded-md shadow-[4px_4px_0_#000] mb-4" style={{ borderWidth: '3px' }}>
                        <svg
                            className="w-10 h-10 text-black"
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
                    <h1 className="text-3xl font-bold text-black uppercase tracking-tight">
                        Database Query Portal
                    </h1>
                    <p className="text-[#6B6B6B] mt-2 font-medium">Sign in to access the portal</p>
                </div>

                {/* Login Card */}
                <div className="bg-white border-3 border-black rounded-md p-6 shadow-[6px_6px_0_#000]" style={{ borderWidth: '3px' }}>
                    <LoginForm />
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-[#6B6B6B] mt-6 font-medium uppercase tracking-wide">
                    Secure database query execution portal
                </p>
            </div>
        </div>
    );
}

export default AuthPage;
