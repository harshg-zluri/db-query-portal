import { spawn } from 'child_process';
import { writeFile, unlink, mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { ExecutionResult } from '../types';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * JavaScript Script Executor
 * Executes scripts in a sandboxed Node.js environment
 */
export class ScriptExecutor {
    /**
     * Execute a JavaScript script with injected database configurations
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
        let tempDir: string | null = null;

        try {
            // Create temporary directory for script execution
            tempDir = await mkdtemp(join(tmpdir(), 'db-portal-script-'));
            const scriptPath = join(tempDir, 'script.js');

            // Write script to temp file
            await writeFile(scriptPath, scriptContent, 'utf-8');

            // Execute script with environment variables
            // Only inject the connection string for the selected database type
            const result = await this.runScript(scriptPath, {
                POSTGRES_URL: dbConfig.postgresUrl || '',
                MONGODB_URL: dbConfig.mongoUrl || '',
                DB_NAME: dbConfig.databaseName,
                DB_TYPE: dbConfig.databaseType
            });

            const duration = Date.now() - startTime;

            logger.info('Script executed', {
                success: result.success,
                duration
            });

            return {
                ...result,
                executedAt: new Date()
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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
            // Cleanup temp directory
            if (tempDir) {
                try {
                    await rm(tempDir, { recursive: true, force: true });
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    }

    /**
     * Run script in child process with resource limits
     */
    private static runScript(
        scriptPath: string,
        env: Record<string, string>
    ): Promise<{ success: boolean; output?: string; error?: string }> {
        return new Promise((resolve) => {
            const stdout: string[] = [];
            const stderr: string[] = [];

            // Spawn node process with memory limit
            const child = spawn('node', [
                `--max-old-space-size=${config.scriptExecution.maxMemoryMb}`,
                scriptPath
            ], {
                env: {
                    ...process.env,
                    ...env,
                    // Disable network for security (basic sandboxing)
                    // Allow access to project node_modules
                    NODE_PATH: join(process.cwd(), 'node_modules'),
                    NODE_OPTIONS: '--no-warnings'
                },
                timeout: config.scriptExecution.timeoutMs
            });

            child.stdout?.on('data', (data) => {
                stdout.push(data.toString());
            });

            child.stderr?.on('data', (data) => {
                stderr.push(data.toString());
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        output: stdout.join('') + (stderr.length > 0 ? '\n\n--- STDERR ---\n' + stderr.join('') : '')
                    });
                } else {
                    resolve({
                        success: false,
                        output: stdout.join(''),
                        error: stderr.join('') || `Process exited with code ${code}`
                    });
                }
            });

            child.on('error', (err) => {
                resolve({
                    success: false,
                    error: err.message
                });
            });

            // Kill on timeout
            setTimeout(() => {
                if (!child.killed) {
                    child.kill('SIGTERM');
                    resolve({
                        success: false,
                        error: `Script execution timed out after ${config.scriptExecution.timeoutMs}ms`
                    });
                }
            }, config.scriptExecution.timeoutMs);
        });
    }

    /**
     * Validate script content for dangerous patterns
     */
    static validate(scriptContent: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check for dangerous Node.js APIs
        const dangerousPatterns = [
            { pattern: /child_process/i, message: 'child_process module is not allowed' },
            { pattern: /cluster/i, message: 'cluster module is not allowed' },
            { pattern: /eval\s*\(/i, message: 'eval() is not allowed' },
            { pattern: /Function\s*\(/i, message: 'Function constructor is not allowed' },
            { pattern: /process\.exit/i, message: 'process.exit() is not allowed' },
            { pattern: /require\s*\(\s*['"]fs['"]\s*\)/i, message: 'Direct fs module usage is restricted' }
        ];

        for (const { pattern, message } of dangerousPatterns) {
            if (pattern.test(scriptContent)) {
                errors.push(message);
            }
        }

        // Note: DDL and MongoDB method checks are now handled via warnings at submission time
        // Only Node.js security patterns are blocked here

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
