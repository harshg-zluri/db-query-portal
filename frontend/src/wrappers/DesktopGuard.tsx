import { type ReactNode, useEffect, useState } from 'react';

interface DesktopGuardProps {
    children: ReactNode;
}

export function DesktopGuard({ children }: DesktopGuardProps) {
    const [isDesktop, setIsDesktop] = useState(true);

    useEffect(() => {
        const checkScreenSize = () => {
            // Using 1024px as standard desktop breakpoint (lg in Tailwind)
            setIsDesktop(window.innerWidth >= 1024);
        };

        // Check on mount
        checkScreenSize();

        // Check on resize
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    if (!isDesktop) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#1a1a1d] p-6 text-center text-[#fafafa]">
                <div className="mb-6 rounded-full bg-[#27272a] p-6">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect width="20" height="14" x="2" y="3" rx="2" />
                        <line x1="8" x2="16" y1="21" y2="21" />
                        <line x1="12" x2="12" y1="17" y2="21" />
                    </svg>
                </div>
                <h1 className="mb-4 text-3xl font-bold">Desktop Only</h1>
                <p className="max-w-md text-lg text-gray-400">
                    This application is designed for larger screens. Please access it on a desktop or laptop computer for the best experience.
                </p>
            </div>
        );
    }

    return <>{children}</>;
}
