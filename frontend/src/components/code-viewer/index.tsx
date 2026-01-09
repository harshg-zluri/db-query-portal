import { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import 'highlight.js/styles/github.css';
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
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (codeRef.current) {
            // Reset highlighting
            codeRef.current.removeAttribute('data-highlighted');
            // Apply highlighting
            hljs.highlightElement(codeRef.current);
        }
    }, [code, language]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Map mongodb to javascript for highlighting
    const hlLanguage = language === 'mongodb' ? 'javascript' : language;

    const lines = code.split('\n');

    return (
        <div
            className={cn(
                'relative bg-white border-2 border-black rounded-md overflow-hidden shadow-[2px_2px_0_#000]',
                className
            )}
        >
            {/* Copy Button */}
            <button
                onClick={handleCopy}
                className={cn(
                    'absolute top-3 right-7 z-10 p-2 rounded-md border-2 transition-all duration-150',
                    copied
                        ? 'bg-[#DCFCE7] border-[#22C55E] text-[#166534]'
                        : 'bg-white border-black text-black hover:bg-[#FEF34B] shadow-[2px_2px_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'
                )}
                title={copied ? 'Copied!' : 'Copy to clipboard'}
            >
                {copied ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                )}
            </button>

            <div
                className="overflow-auto"
                style={{ maxHeight }}
            >
                {showLineNumbers ? (
                    <table className="w-full border-collapse">
                        <tbody>
                            {lines.map((line, index) => (
                                <tr key={index} className="hover:bg-[#FEF34B]/20 transition-colors">
                                    <td className="w-10 select-none text-right pr-4 pl-3 py-0 text-[#6B6B6B] text-sm font-mono border-r-2 border-black sticky left-0 bg-[#FAF9F6]">
                                        {index + 1}
                                    </td>
                                    <td className="px-2 py-1">
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
                    <pre className="p-4 m-0 overflow-x-auto bg-white">
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


