import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@layouts/app-layout';
import { AuthWrapper } from '@wrappers/auth-wrapper';
import { AuthPage } from '@features/auth';
import { DashboardPage } from '@features/dashboard';
import { SubmissionsPage } from '@features/submissions';
import { ApprovalsPage } from '@features/approvals';
import { ROUTES } from '@constants/routes';
import { UserRole } from '@/types';

export const router = createBrowserRouter([
    {
        path: ROUTES.LOGIN,
        element: <AuthPage />,
    },
    {
        path: '/',
        element: (
            <AuthWrapper>
                <AppLayout />
            </AuthWrapper>
        ),
        children: [
            {
                index: true,
                element: <Navigate to={ROUTES.DASHBOARD} replace />,
            },
            {
                path: 'dashboard',
                element: <DashboardPage />,
            },
            {
                path: 'submissions',
                element: <SubmissionsPage />,
            },
            {
                path: 'approvals',
                element: (
                    <AuthWrapper requiredRole={UserRole.MANAGER}>
                        <ApprovalsPage />
                    </AuthWrapper>
                ),
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
    },
]);
