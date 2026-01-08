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
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">
                Query <span className="text-red-500">*</span>
            </label>

            <div
                className={cn(
                    'relative rounded-lg border overflow-hidden transition-all duration-200',
                    error
                        ? 'border-red-500'
                        : isFocused
                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                            : 'border-[#27272a] hover:border-[#3f3f46]'
                )}
            >
                {/* Syntax highlighted overlay */}
                <pre
                    ref={highlightRef}
                    className="absolute inset-0 p-0 m-0 overflow-auto pointer-events-none font-mono text-sm leading-6 whitespace-pre-wrap break-words"
                    aria-hidden="true"
                >
                    <code
                        className={`language-${language} whitespace-pre-wrap break-words`}
                        style={{ fontFamily: 'inherit', fontSize: 'inherit', padding: 0, margin: 0, border: 0, background: 'transparent' }}
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
                        'relative w-full h-48 p-4 bg-transparent text-transparent caret-zinc-100',
                        'font-mono text-sm leading-6 resize-none',
                        'focus:outline-none',
                        'placeholder:text-zinc-600'
                    )}
                    spellCheck={false}
                />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <p className="text-xs text-zinc-500">
                {databaseType === DatabaseType.MONGODB
                    ? 'Enter a MongoDB query (JavaScript syntax)'
                    : 'Enter a SQL query'}
            </p>
        </div>
    );
}
