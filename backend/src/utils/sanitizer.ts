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
 * Detect dangerous DDL statements (DROP, TRUNCATE, ALTER, CREATE)
 * Used to prevent schema modification via the query portal
 */
export function isDangerousDDL(input: string): boolean {
    const ddlPattern = /\b(DROP|TRUNCATE|ALTER|CREATE)\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW|FUNCTION|PROCEDURE|TRIGGER)\b/i;
    return ddlPattern.test(input);
}

/**
 * Detect dangerous MongoDB methods in scripts (drop, dropDatabase)
 */
export function isDangerousMongoMethod(input: string): boolean {
    // Matches .drop(), .dropDatabase(), .remove()
    // Note: This is a basic check and can be bypassed with obfuscation
    const mongoDestructivePattern = /\.(drop|dropDatabase|remove)\s*\(/;
    return mongoDestructivePattern.test(input);
}

/**
 * Get security warnings for a query or script
 * Returns an array of warning messages (empty if safe)
 */
export function getSecurityWarnings(input: string): string[] {
    const warnings: string[] = [];

    // Check for dangerous DDL statements
    if (isDangerousDDL(input)) {
        warnings.push('⚠️ Contains dangerous DDL statement (DROP, TRUNCATE, ALTER, or CREATE). This may modify database schema.');
    }

    // Check for dangerous MongoDB methods
    if (isDangerousMongoMethod(input)) {
        warnings.push('⚠️ Contains destructive MongoDB method (.drop, .dropDatabase, or .remove). This may delete data.');
    }

    // Check for DELETE without WHERE (potentially dangerous)
    if (/\bDELETE\s+FROM\s+\w+\s*(?:;|$)/i.test(input)) {
        warnings.push('⚠️ Contains DELETE without WHERE clause. This will delete ALL rows in the table.');
    }

    // Check for UPDATE without WHERE (potentially dangerous)
    if (/\bUPDATE\s+\w+\s+SET\s+[^;]+(?:;|$)/i.test(input) && !/\bWHERE\b/i.test(input)) {
        warnings.push('⚠️ Contains UPDATE without WHERE clause. This will update ALL rows in the table.');
    }

    return warnings;
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
