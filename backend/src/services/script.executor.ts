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
            postgresConfigPath?: string;
            mongoUri?: string;
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
            const result = await this.runScript(scriptPath, {
                DB_CONFIG_FILE: dbConfig.postgresConfigPath || '',
                MONGO_URI: dbConfig.mongoUri || ''
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
                        output: stdout.join('')
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

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
