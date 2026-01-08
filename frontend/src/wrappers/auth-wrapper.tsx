import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@stores/auth-store';
import { ROUTES } from '@constants/routes';
import { UserRole } from '@/types';

interface AuthWrapperProps {
    children: ReactNode;
    requiredRole?: UserRole;
}

export function AuthWrapper({ children, requiredRole }: AuthWrapperProps) {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();

    // Not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
    }

    // Check role if required
    if (requiredRole && user) {
        const roleHierarchy = {
            [UserRole.DEVELOPER]: 0,
            [UserRole.MANAGER]: 1,
            [UserRole.ADMIN]: 2,
        };

        const userRoleLevel = roleHierarchy[user.role as UserRole] || 0;
        const requiredRoleLevel = roleHierarchy[requiredRole];

        if (userRoleLevel < requiredRoleLevel) {
            // User doesn't have required role, redirect to dashboard
            return <Navigate to={ROUTES.DASHBOARD} replace />;
        }
    }

    return <>{children}</>;
}

// Higher-order component for role-based access
export function withAuth<P extends object>(
    Component: React.ComponentType<P>,
    requiredRole?: UserRole
) {
    return function AuthenticatedComponent(props: P) {
        return (
            <AuthWrapper requiredRole={requiredRole}>
                <Component {...props} />
            </AuthWrapper>
        );
    };
}
