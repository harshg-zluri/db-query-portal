// Input sanitization utilities to prevent injection attacks

// Dangerous MongoDB operators that could lead to code execution
const DANGEROUS_MONGO_OPERATORS = [
    '$where',
    '$function',
    '$accumulator',
    'mapReduce',
    '$expr'
];

// Regex patterns for detection
const SQL_INJECTION_PATTERNS = [
    /\b(DROP|TRUNCATE|ALTER|CREATE|DELETE)\s+(TABLE|DATABASE|SCHEMA)\b/i,  // DDL/DML with object
    /(-{2})/,  // SQL line comment
    /(\/\*|\*\/)/,  // SQL block comment
    /;\s*\b(DROP|DELETE|INSERT|UPDATE|SELECT|TRUNCATE)\b/i,  // Chained commands
    /\bOR\b\s*\d+\s*=\s*\d+/i,  // Boolean tautology: OR 1=1
    /\bAND\b\s*\d+\s*=\s*\d+/i,  // AND tautology: AND 1=1
    /\bOR\b\s*'[^']*'\s*=\s*'[^']*'/i,  // String tautology: OR '1'='1'
    /'[^']*'\s*=\s*'[^']*'/i,  // Any string comparison tautology: '1'='1'
    /\bOR\b\s+'/i,  // OR keyword followed by quote (catches 1' OR '1'='1')
    /;\s*--/,  // Semicolon followed by comment
    /\bUNION\b\s*\b(SELECT|ALL)\b/i,  // UNION injection
    /\/\*.*\*\/.*OR.*\/\*.*\*\//i  // Comment-obfuscated OR (e.g., 1/**/OR/**/1=1)
];

/**
 * Sanitize input to prevent MongoDB NoSQL injection
 * Rejects inputs containing dangerous operators
 */
export function sanitizeMongoInput(input: string): string {
    const upperInput = input.toUpperCase();

    for (const operator of DANGEROUS_MONGO_OPERATORS) {
        if (upperInput.includes(operator.toUpperCase())) {
            throw new Error(`Dangerous operator "${operator}" is not allowed in queries`);
        }
    }

    // Check for JavaScript code injection attempts
    if (input.includes('function(') || input.includes('function (')) {
        throw new Error('JavaScript functions are not allowed in queries');
    }

    return input;
}

/**
 * Detect potential SQL injection attempts in user input
 * Note: This is a secondary defense - parameterized queries are primary
 */
export function detectSqlInjection(input: string): boolean {
    for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            return true;
        }
    }
    return false;
}

/**
 * Sanitize string for safe display (prevent XSS)
 */
export function sanitizeForDisplay(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Validate and sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts
    const sanitized = fileName
        .replace(/\.\./g, '')
        .replace(/[/\\]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');

    // Ensure file has valid extension
    if (!sanitized.endsWith('.js')) {
        throw new Error('Only .js files are allowed');
    }

    return sanitized;
}

/**
 * Truncate string for safe logging/display
 */
export function truncate(str: string, maxLength: number = 500): string {
    if (str.length <= maxLength) {
        return str;
    }
    return str.substring(0, maxLength) + '...';
}
