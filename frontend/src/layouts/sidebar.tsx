import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@stores/auth-store';
import { NAV_ITEMS } from '@constants/routes';
import { cn } from '@utils/cn';
import { UserRole } from '@/types';

export function Sidebar() {
    const { user } = useAuthStore();

    const filteredNavItems = NAV_ITEMS.filter((item) =>
        (item.roles as readonly string[]).includes(user?.role || UserRole.DEVELOPER)
    );

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'dashboard':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                        />
                    </svg>
                );
            case 'submissions':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                );
            case 'approvals':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                );
            case 'admin':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <aside className="w-60 bg-white border-r border-zinc-200 flex flex-col min-h-screen">
            {/* Logo */}
            <div className="px-5 py-4 border-b border-zinc-200">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-zinc-900 rounded-md flex items-center justify-center">
                        <svg
                            className="w-4 h-4 text-white"
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
                    <span className="text-sm font-semibold text-zinc-900">DB Portal</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-3">
                <ul className="space-y-0.5">
                    {filteredNavItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm',
                                        'transition-colors duration-150',
                                        isActive
                                            ? 'bg-linear-to-r from-[#6366F1] to-[#8B5CF6] text-white font-medium shadow-md'
                                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                                    )
                                }
                            >
                                {getIcon(item.icon)}
                                {item.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User */}
            <div className="px-3 py-3 border-t border-zinc-200">
                <div className="flex items-center gap-2.5 px-2.5 py-2">
                    <div className="w-7 h-7 bg-zinc-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-zinc-700">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{user?.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
