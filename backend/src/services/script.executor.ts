import ivm from 'isolated-vm';
import { ExecutionResult } from '../types';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * JavaScript Script Executor using V8 Isolates
 * Executes scripts in a completely isolated V8 context for security
 * 
 * Security features:
 * - Separate V8 isolate with memory limits
 * - No access to Node.js APIs (fs, child_process, etc.)
 * - Timeout enforcement
 * - No network access from within scripts
 */
export class ScriptExecutor {
    /**
     * Execute a JavaScript script in an isolated V8 context
     * Database connections are passed as JSON data, not live connections
     */
    static async execute(
        scriptContent: string,
        dbConfig: {
            postgresUrl?: string;
            mongoUrl?: string;
            databaseName: string;
            databaseType: string;
        }
    ): Promise<ExecutionResult> {
        const startTime = Date.now();
        let isolate: ivm.Isolate | null = null;

        try {
            // Create isolate with memory limit
            isolate = new ivm.Isolate({
                memoryLimit: config.scriptExecution.maxMemoryMb
            });

            // Create a new context within this isolate
            const context = await isolate.createContext();

            // Get a reference to the global object within the context
            const jail = context.global;

            // Set up the jail with limited APIs
            await jail.set('global', jail.derefInto());

            // Create console.log that captures output
            const logs: string[] = [];
            const errors: string[] = [];

            // Create log function
            await jail.set('_log', new ivm.Callback((...args: unknown[]) => {
                logs.push(args.map(a =>
                    typeof a === 'object' ? JSON.stringify(a) : String(a)
                ).join(' '));
            }));

            // Create error function  
            await jail.set('_error', new ivm.Callback((...args: unknown[]) => {
                errors.push(args.map(a =>
                    typeof a === 'object' ? JSON.stringify(a) : String(a)
                ).join(' '));
            }));

            // Inject database config as readonly data
            await jail.set('DB_CONFIG', new ivm.ExternalCopy({
                postgresUrl: dbConfig.postgresUrl || '',
                mongoUrl: dbConfig.mongoUrl || '',
                databaseName: dbConfig.databaseName,
                databaseType: dbConfig.databaseType
            }).copyInto());

            // Prepare script with console shim and async wrapper
            const wrappedScript = `
                // Console shim
                const console = {
                    log: (...args) => _log(...args),
                    error: (...args) => _error(...args),
                    warn: (...args) => _log('[WARN]', ...args),
                    info: (...args) => _log('[INFO]', ...args)
                };

                // User script execution
                (async function() {
                    try {
                        ${scriptContent}
                    } catch (e) {
                        console.error('Script error:', e.message || e);
                        throw e;
                    }
                })();
            `;

            // Compile and run the script with timeout
            const script = await isolate.compileScript(wrappedScript);

            await script.run(context, {
                timeout: config.scriptExecution.timeoutMs
            });

            const duration = Date.now() - startTime;

            logger.info('Script executed in isolate', {
                success: true,
                duration,
                memoryUsed: isolate.getHeapStatisticsSync().used_heap_size
            });

            // Combine output
            let output = logs.join('\n');
            if (errors.length > 0) {
                output += '\n\n--- STDERR ---\n' + errors.join('\n');
            }

            return {
                success: true,
                output: output || 'Script executed successfully (no output)',
                executedAt: new Date()
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            let errorMessage = 'Unknown error';

            if (error instanceof Error) {
                if (error.message.includes('Script execution timed out')) {
                    errorMessage = `Script execution timed out after ${config.scriptExecution.timeoutMs}ms`;
                } else if (error.message.includes('Isolate was disposed')) {
                    errorMessage = 'Script exceeded memory limit';
                } else {
                    errorMessage = error.message;
                }
            }

            logger.error('Script execution failed', {
                error: errorMessage,
                duration
            });

            return {
                success: false,
                error: errorMessage,
                executedAt: new Date()
            };
        } finally {
            // Dispose isolate to free memory
            if (isolate) {
                isolate.dispose();
            }
        }
    }

    /**
     * Validate script content for dangerous patterns
     * Note: The isolate already blocks Node.js APIs, but we still validate
     * to provide helpful error messages before execution
     */
    static validate(scriptContent: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check for patterns that won't work in isolate (to give clear error messages)
        const blockedPatterns = [
            { pattern: /require\s*\(/i, message: 'require() is not available - scripts run in isolated V8 context' },
            { pattern: /import\s+/i, message: 'ES imports are not available - scripts run in isolated V8 context' },
            { pattern: /child_process/i, message: 'child_process is not available in sandbox' },
            { pattern: /process\./i, message: 'process object is not available in sandbox' },
            { pattern: /\bfs\b/i, message: 'File system access is not available in sandbox' },
            { pattern: /eval\s*\(/i, message: 'eval() is not allowed for security' },
            { pattern: /Function\s*\(/i, message: 'Function constructor is not allowed for security' }
        ];

        for (const { pattern, message } of blockedPatterns) {
            if (pattern.test(scriptContent)) {
                errors.push(message);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
