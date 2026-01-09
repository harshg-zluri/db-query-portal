import { useState, useMemo } from 'react';
import { Button } from '@components/button';
import { Input } from '@components/input';
import { Modal, ModalFooter } from '@components/modal';
import { UserTable } from './components/user-table';
import { UserFormModal } from './components/user-form-modal';
import { useUsers, usePods, useCreateUser, useUpdateUser, useDeleteUser } from './queries/use-admin';
import type { User } from '@/types';
import toast from 'react-hot-toast';

export function AdminPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useMemo(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading } = useUsers(debouncedSearch, page);
    const { data: pods = [] } = usePods();
    const createUser = useCreateUser();
    const updateUser = useUpdateUser();
    const deleteUser = useDeleteUser();

    const users = data?.requests || [];
    const pagination = data?.pagination;

    const handleCreateUser = () => {
        setEditingUser(null);
        setIsFormOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setIsFormOpen(true);
    };

    const handleDeleteUser = (user: User) => {
        setDeletingUser(user);
    };

    const handleFormSubmit = async (formData: any) => {
        try {
            if (editingUser) {
                await updateUser.mutateAsync({ id: editingUser.id, ...formData });
                toast.success('User updated successfully');
            } else {
                await createUser.mutateAsync(formData);
                toast.success('User created successfully');
            }
            setIsFormOpen(false);
            setEditingUser(null);
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to save user');
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingUser) return;
        try {
            await deleteUser.mutateAsync(deletingUser.id);
            toast.success('User deleted successfully');
            setDeletingUser(null);
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to delete user');
        }
    };

    return (
        <div className="p-6 animate-fade-in">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-black uppercase tracking-tight">
                    Admin Panel
                </h1>
                <p className="text-sm text-[#6B6B6B] mt-1">
                    Manage users, roles, and pod assignments
                </p>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <div className="relative">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B6B]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded-md text-black placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#FEF34B] focus:ring-offset-1 hover:shadow-[2px_2px_0_#000] focus:shadow-[2px_2px_0_#000] transition-all duration-150"
                        />
                    </div>
                </div>
                <Button onClick={handleCreateUser}>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add User
                </Button>
            </div>

            {/* User Table */}
            <UserTable
                users={users}
                isLoading={isLoading}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
            />

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-[#6B6B6B]">
                        Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="px-4 py-2 text-sm font-semibold border-2 border-black rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FAF9F6] hover:shadow-[2px_2px_0_#000] transition-all duration-150"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={page >= pagination.totalPages}
                            className="px-4 py-2 text-sm font-semibold border-2 border-black rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FAF9F6] hover:shadow-[2px_2px_0_#000] transition-all duration-150"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* User Form Modal */}
            <UserFormModal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditingUser(null);
                }}
                onSubmit={handleFormSubmit}
                user={editingUser}
                pods={pods}
                isLoading={createUser.isPending || updateUser.isPending}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deletingUser}
                onClose={() => setDeletingUser(null)}
                title="Delete User"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-[#FEE2E2] border-2 border-[#EF4444] rounded-md shadow-[2px_2px_0_#000]">
                        <svg
                            className="w-6 h-6 text-[#991B1B] flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                        <div>
                            <p className="text-sm font-bold text-[#991B1B] uppercase">Warning</p>
                            <p className="text-sm text-[#991B1B] mt-1">
                                Are you sure you want to delete <strong>{deletingUser?.name}</strong>? This action cannot be undone.
                            </p>
                        </div>
                    </div>

                    <ModalFooter>
                        <Button variant="secondary" onClick={() => setDeletingUser(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleConfirmDelete}
                            isLoading={deleteUser.isPending}
                        >
                            Delete User
                        </Button>
                    </ModalFooter>
                </div>
            </Modal>
        </div>
    );
}
