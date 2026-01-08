import { useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import 'highlight.js/styles/atom-one-dark.css';
import { cn } from '@utils/cn';

// Register languages
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);

export interface CodeViewerProps {
    code: string;
    language?: 'sql' | 'javascript' | 'json' | 'mongodb';
    className?: string;
    showLineNumbers?: boolean;
    maxHeight?: string;
}

export function CodeViewer({
    code,
    language = 'sql',
    className,
    showLineNumbers = true,
    maxHeight = '400px',
}: CodeViewerProps) {
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (codeRef.current) {
            // Reset highlighting
            codeRef.current.removeAttribute('data-highlighted');
            // Apply highlighting
            hljs.highlightElement(codeRef.current);
        }
    }, [code, language]);

    // Map mongodb to javascript for highlighting
    const hlLanguage = language === 'mongodb' ? 'javascript' : language;

    const lines = code.split('\n');

    return (
        <div
            className={cn(
                'relative bg-[#111113] border border-[#27272a] rounded-lg overflow-hidden',
                className
            )}
        >
            <div
                className="overflow-auto"
                style={{ maxHeight }}
            >
                {showLineNumbers ? (
                    <table className="w-full border-collapse">
                        <tbody>
                            {lines.map((line, index) => (
                                <tr key={index} className="hover:bg-[#1a1a1d]/50">
                                    <td className="select-none text-right pr-4 pl-3 py-0 text-zinc-600 text-sm font-mono border-r border-[#27272a] sticky left-0 bg-[#111113]">
                                        {index + 1}
                                    </td>
                                    <td className="pl-4 pr-3 py-0">
                                        <code
                                            ref={index === 0 ? codeRef : undefined}
                                            className={`language-${hlLanguage} font-mono text-sm block`}
                                            style={{ background: 'transparent', padding: 0 }}
                                        >
                                            {line || ' '}
                                        </code>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <pre className="p-4 m-0 overflow-x-auto">
                        <code
                            ref={codeRef}
                            className={`language-${hlLanguage} font-mono text-sm`}
                        >
                            {code}
                        </code>
                    </pre>
                )}
            </div>
        </div>
    );
}
