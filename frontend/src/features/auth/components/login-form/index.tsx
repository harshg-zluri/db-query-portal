import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@components/input';
import { Button } from '@components/button';
import { useLogin } from '@features/auth/queries/use-login';
import { useAuthStore } from '@stores/auth-store';
import { ROUTES } from '@constants/routes';
import { loginSchema, type LoginFormData } from '@utils/schemas';
import { UserRole } from '@/types';
import toast from 'react-hot-toast';

export function LoginForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const login = useAuthStore((state) => state.login);
    const loginMutation = useLogin();

    const getDefaultRoute = (role: string) => {
        // Redirect based on role
        if (role === UserRole.ADMIN) {
            return ROUTES.ADMIN;
        }
        if (role === UserRole.MANAGER) {
            return ROUTES.APPROVALS;
        }
        return ROUTES.DASHBOARD;
    };

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            const result = await loginMutation.mutateAsync(data);
            login(result.accessToken, result.refreshToken, result.user);
            toast.success('Login successful!');

            // Check if there's a specific redirect location, otherwise use role-based redirect
            const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
            const redirectTo = from || getDefaultRoute(result.user.role);
            navigate(redirectTo, { replace: true });
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid credentials';
            toast.error(message);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                error={errors.email?.message}
                autoComplete="email"
            />

            <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                error={errors.password?.message}
                autoComplete="current-password"
            />

            <Button
                type="submit"
                className="w-full"
                isLoading={loginMutation.isPending}
            >
                Sign in
            </Button>
        </form>
    );
}
