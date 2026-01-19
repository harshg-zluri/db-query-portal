import { useState, useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import javascript from 'highlight.js/lib/languages/javascript';
import { cn } from '@utils/cn';
import { DatabaseType } from '@/types';

// Register languages
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('javascript', javascript);

interface QueryEditorProps {
    value: string;
    onChange: (value: string) => void;
    databaseType: DatabaseType | '';
    error?: string;
    placeholder?: string;
}

export function QueryEditor({
    value,
    onChange,
    databaseType,
    error,
    placeholder,
}: QueryEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    const language = databaseType === DatabaseType.MONGODB ? 'javascript' : 'sql';

    useEffect(() => {
        if (highlightRef.current) {
            const code = highlightRef.current.querySelector('code');
            if (code) {
                code.textContent = value || ' ';
                code.removeAttribute('data-highlighted');
                hljs.highlightElement(code);
            }
        }
    }, [value, language]);

    const handleScroll = () => {
        if (textareaRef.current && highlightRef.current) {
            highlightRef.current.scrollTop = textareaRef.current.scrollTop;
            highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    const getPlaceholder = () => {
        if (placeholder) return placeholder;
        if (databaseType === DatabaseType.MONGODB) {
            return 'db.collection.find({ field: "value" })';
        }
        return 'SELECT * FROM table_name WHERE condition;';
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#0F172A] ">
                Query <span className="text-[#ef4444]">*</span>
            </label>

            <div
                className={cn(
                    'relative rounded-md border-2 overflow-hidden transition-all duration-150 bg-white',
                    error
                        ? 'border-[#ef4444]'
                        : isFocused
                            ? 'border-[#E2E8F0] ring-2 ring-[#6366F1] '
                            : 'border-[#E2E8F0] hover:'
                )}
            >
                {/* Syntax highlighted overlay */}
                <pre
                    ref={highlightRef}
                    className="absolute inset-0 p-0 m-0 overflow-auto pointer-events-none font-mono text-sm leading-6 whitespace-pre-wrap break-words bg-transparent"
                    aria-hidden="true"
                >
                    <code
                        className={`language-${language} whitespace-pre-wrap break-words !text-[#0F172A]`}
                        style={{
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            padding: 0,
                            margin: 0,
                            border: 0,
                            background: 'transparent',
                            color: '#000'
                        }}
                    >
                        {value || ' '}
                    </code>
                </pre>

                {/* Actual textarea */}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onScroll={handleScroll}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={getPlaceholder()}
                    className={cn(
                        'relative w-full h-48 p-4 bg-transparent text-transparent caret-black',
                        'font-mono text-sm leading-6 resize-none',
                        'focus:outline-none',
                        'placeholder:text-[#9CA3AF]'
                    )}
                    spellCheck={false}
                />
            </div>

            {error && <p className="text-sm text-[#ef4444] font-medium">{error}</p>}

            <p className="text-xs text-[#64748B]">
                {databaseType === DatabaseType.MONGODB
                    ? 'Enter a MongoDB query (JavaScript syntax)'
                    : 'Enter a SQL query'}
            </p>
        </div>
    );
}
