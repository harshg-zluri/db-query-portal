import type { User } from '@/types';
import { UserRole } from '@/types';
import { SkeletonTable } from '@components/skeleton';
import { cn } from '@utils/cn';

interface UserTableProps {
    users: User[];
    isLoading: boolean;
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
}

export function UserTable({ users, isLoading, onEdit, onDelete }: UserTableProps) {
    if (isLoading) {
        return (
            <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0_#000] overflow-hidden">
                <SkeletonTable rows={5} columns={5} />
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0_#000] p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#FAF9F6] border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0_#000]">
                    <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-black uppercase mb-1">No Users Found</h3>
                <p className="text-sm text-[#6B6B6B]">Try adjusting your search or add a new user.</p>
            </div>
        );
    }

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case UserRole.ADMIN:
                return 'bg-[#FEE2E2] text-[#991B1B] border-[#EF4444]';
            case UserRole.MANAGER:
                return 'bg-[#DBEAFE] text-[#1E40AF] border-[#3B82F6]';
            default:
                return 'bg-[#DCFCE7] text-[#166534] border-[#22C55E]';
        }
    };

    return (
        <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0_#000] overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b-2 border-black bg-[#FAF9F6]">
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Managed Pods
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                    {users.map((user, index) => (
                        <tr
                            key={user.id}
                            className="hover:bg-[#FEF34B]/20 transition-colors animate-fade-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[#5791FF] border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0_#000]">
                                        <span className="text-xs font-bold text-white">
                                            {user.name?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                    <span className="text-sm font-semibold text-black">{user.name}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-[#6B6B6B] font-mono">
                                {user.email}
                            </td>
                            <td className="px-4 py-3">
                                <span className={cn(
                                    'text-xs px-2 py-1 border-2 rounded font-bold uppercase',
                                    getRoleBadgeClass(user.role)
                                )}>
                                    {user.role}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <span className="text-sm text-[#6B6B6B]">
                                    {user.managedPodIds?.length || 0} pods
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onEdit(user)}
                                        className="p-2 text-black border-2 border-black rounded-md shadow-[2px_2px_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#FEF34B] transition-all duration-150"
                                        title="Edit user"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => onDelete(user)}
                                        className="p-2 text-[#991B1B] border-2 border-[#EF4444] rounded-md shadow-[2px_2px_0_#EF4444] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#FEE2E2] transition-all duration-150"
                                        title="Delete user"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
