interface WarningsDisplayProps {
    warnings: string[];
    className?: string;
}

export function WarningsDisplay({ warnings, className }: WarningsDisplayProps) {
    if (!warnings || warnings.length === 0) return null;

    return (
        <div className={`p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg ${className}`}>
            <div className="flex items-start gap-2">
                <svg
                    className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
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
                <div className="flex-1">
                    <p className="text-sm font-medium text-amber-500 mb-1">Security Warnings</p>
                    <ul className="space-y-0.5">
                        {warnings.map((warning, index) => (
                            <li key={index} className="text-sm text-amber-200/80 flex items-start gap-1">
                                <span className="text-amber-500">•</span>
                                {warning}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
