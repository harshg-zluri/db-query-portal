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
            default:
                return null;
        }
    };

    return (
        <aside className="w-64 bg-[#111113] border-r border-[#27272a] flex flex-col min-h-screen">
            {/* Logo */}
            <div className="p-6 border-b border-[#27272a]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
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
                    <div>
                        <h1 className="text-lg font-semibold text-zinc-100">DB Portal</h1>
                        <p className="text-xs text-zinc-500">Query Execution</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-1">
                    {filteredNavItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20'
                                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#1a1a1d]'
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

            {/* User info at bottom */}
            <div className="p-4 border-t border-[#27272a]">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 bg-[#1a1a1d] rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-zinc-400">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">{user?.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
