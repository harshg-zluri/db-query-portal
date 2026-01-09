import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, ModalFooter } from '@components/modal';
import { Input } from '@components/input';
import { Select } from '@components/select';
import { Button } from '@components/button';
import type { User, Pod } from '@/types';
import { UserRole } from '@/types';

const createUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['developer', 'manager', 'admin']),
    managedPodIds: z.array(z.string()).optional(),
});

const updateUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
    role: z.enum(['developer', 'manager', 'admin']),
    managedPodIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof createUserSchema>;

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: FormData) => void;
    user?: User | null;
    pods: Pod[];
    isLoading: boolean;
}

export function UserFormModal({
    isOpen,
    onClose,
    onSubmit,
    user,
    pods,
    isLoading,
}: UserFormModalProps) {
    const isEditing = !!user;

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(isEditing ? updateUserSchema : createUserSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            role: 'developer',
            managedPodIds: [],
        },
    });

    const selectedRole = watch('role');
    const selectedPods = watch('managedPodIds') || [];

    useEffect(() => {
        if (user) {
            reset({
                name: user.name,
                email: user.email,
                password: '',
                role: user.role as 'developer' | 'manager' | 'admin',
                managedPodIds: user.managedPodIds || [],
            });
        } else {
            reset({
                name: '',
                email: '',
                password: '',
                role: 'developer',
                managedPodIds: [],
            });
        }
    }, [user, reset]);

    const handleFormSubmit = (data: FormData) => {
        // Remove password if editing and no new password provided
        if (isEditing && !data.password) {
            const { password, ...rest } = data;
            onSubmit(rest as FormData);
        } else {
            onSubmit(data);
        }
    };

    const togglePod = (podId: string) => {
        const current = selectedPods || [];
        const newPods = current.includes(podId)
            ? current.filter(id => id !== podId)
            : [...current, podId];
        setValue('managedPodIds', newPods);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Edit User' : 'Create New User'}
            size="md"
        >
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
                <Input
                    label="Name"
                    placeholder="John Doe"
                    {...register('name')}
                    error={errors.name?.message}
                />

                <Input
                    label="Email"
                    type="email"
                    placeholder="john@example.com"
                    {...register('email')}
                    error={errors.email?.message}
                    disabled={isEditing}
                />

                <Input
                    label={isEditing ? 'New Password (leave blank to keep current)' : 'Password'}
                    type="password"
                    placeholder="••••••••"
                    {...register('password')}
                    error={errors.password?.message}
                />

                <Select
                    label="Role"
                    {...register('role')}
                    error={errors.role?.message}
                    options={[
                        { value: 'developer', label: 'Developer' },
                        { value: 'manager', label: 'Manager' },
                        { value: 'admin', label: 'Admin' },
                    ]}
                />

                {/* Pod Assignment */}
                {(selectedRole === 'manager' || selectedRole === 'admin') && (
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-black uppercase tracking-wide">
                            Managed Pods
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {pods.map((pod) => (
                                <button
                                    key={pod.id}
                                    type="button"
                                    onClick={() => togglePod(pod.id)}
                                    className={`px-3 py-1.5 text-sm font-semibold border-2 rounded-md transition-all duration-150 ${selectedPods.includes(pod.id)
                                            ? 'bg-[#FEF34B] border-black text-black shadow-[2px_2px_0_#000]'
                                            : 'bg-white border-black text-black hover:bg-[#FAF9F6]'
                                        }`}
                                >
                                    {pod.name}
                                </button>
                            ))}
                        </div>
                        {pods.length === 0 && (
                            <p className="text-sm text-[#6B6B6B]">No pods available</p>
                        )}
                    </div>
                )}

                <ModalFooter>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        {isEditing ? 'Update User' : 'Create User'}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}
