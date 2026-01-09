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
                            strokeWidth={2}
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
                            strokeWidth={2}
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
                            strokeWidth={2}
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
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <aside className="w-64 bg-white border-r-2 border-black flex flex-col min-h-screen">
            {/* Logo */}
            <div className="p-6 border-b-2 border-black">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FEF34B] border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0_#000]">
                        <svg
                            className="w-6 h-6 text-black"
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
                        <h1 className="text-lg font-bold text-black uppercase tracking-tight">DB Portal</h1>
                        <p className="text-xs text-[#6B6B6B] font-medium">Query Execution</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-2">
                    {filteredNavItems.map((item, index) => (
                        <li
                            key={item.path}
                            className="animate-slide-up"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold',
                                        'border-2 transition-all duration-150',
                                        isActive
                                            ? 'bg-[#FEF34B] text-black border-black shadow-[2px_2px_0_#000]'
                                            : 'text-black border-transparent hover:border-black hover:bg-[#FAF9F6] hover:shadow-[2px_2px_0_#000]'
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
            <div className="p-4 border-t-2 border-black">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-10 h-10 bg-[#5791FF] border-2 border-black rounded-md flex items-center justify-center shadow-[2px_2px_0_#000]">
                        <span className="text-sm font-bold text-white">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-black truncate">{user?.name}</p>
                        <p className="text-xs text-[#6B6B6B] truncate">{user?.email}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
