import { ScriptExecutor } from '../../../src/services/script.executor';

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    mkdtemp: jest.fn().mockResolvedValue('/tmp/test-script'),
    rm: jest.fn().mockResolvedValue(undefined)
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    mkdtemp: jest.fn().mockResolvedValue('/tmp/test-script'),
    rm: jest.fn().mockResolvedValue(undefined)
}));

// Mock config
jest.mock('../../../src/config/environment', () => ({
    config: {
        scriptExecution: {
            timeoutMs: 50, // Short timeout for testing
            maxMemoryMb: 128
        },
        // We need other config parts if accessed, but ScriptExecutor only uses scriptExecution
        requestLimits: { maxPendingPerUser: 5 }
    }
}));

import { spawn } from 'child_process';
import { writeFile, mkdtemp, rm } from 'fs/promises';

describe('ScriptExecutor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validate', () => {
        it('should pass valid script', () => {
            const script = `
        const result = await db.find({});
        console.log(result);
      `;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject child_process', () => {
            const script = `const exec = require('child_process');`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('child_process module is not allowed');
        });

        it('should reject cluster', () => {
            const script = `const cluster = require('cluster');`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('cluster module is not allowed');
        });

        it('should reject eval', () => {
            const script = `eval('console.log(1)');`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('eval() is not allowed');
        });

        it('should reject Function constructor', () => {
            const script = `new Function('return 1')();`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Function constructor is not allowed');
        });

        it('should reject process.exit', () => {
            const script = `process.exit(0);`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('process.exit() is not allowed');
        });

        it('should reject direct fs usage', () => {
            const script = `const fs = require('fs');`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Direct fs module usage is restricted');
        });

        it('should allow DDL statements (warnings handled at submission)', () => {
            // DDL statements are now allowed through validation
            // Warnings are generated at request submission time, not script validation
            const script = `
                await client.query('DROP TABLE users');
            `;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(true);
        });

        it('should allow MongoDB methods (warnings handled at submission)', () => {
            // MongoDB destructive methods are now allowed through validation
            // Warnings are generated at request submission time
            const script = `
                await db.collection('users').drop();
            `;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(true);
        });

        it('should collect multiple errors', () => {
            const script = `
        const exec = require('child_process');
        eval('code');
        process.exit(1);
      `;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });

    describe('execute', () => {
        it('should execute script successfully', async () => {
            const mockProcess = {
                stdout: {
                    on: jest.fn((event, cb) => {
                        if (event === 'data') cb('Script output');
                    })
                },
                stderr: {
                    on: jest.fn()
                },
                on: jest.fn((event, cb) => {
                    if (event === 'close') setTimeout(() => cb(0), 10);
                }),
                killed: false,
                kill: jest.fn()
            };

            (spawn as jest.Mock).mockReturnValue(mockProcess);

            const result = await ScriptExecutor.execute('console.log("test")', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(true);
            expect(result.output).toBe('Script output');
            expect(writeFile).toHaveBeenCalled();
            expect(rm).toHaveBeenCalled();
        });

        it('should handle script failure', async () => {
            const mockProcess = {
                stdout: {
                    on: jest.fn()
                },
                stderr: {
                    on: jest.fn((event, cb) => {
                        if (event === 'data') cb('Error occurred');
                    })
                },
                on: jest.fn((event, cb) => {
                    if (event === 'close') setTimeout(() => cb(1), 10);
                }),
                killed: false,
                kill: jest.fn()
            };

            (spawn as jest.Mock).mockReturnValue(mockProcess);

            const result = await ScriptExecutor.execute('throw new Error()', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Error occurred');
        });

        it('should handle spawn error', async () => {
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn((event, cb) => {
                    if (event === 'error') setTimeout(() => cb(new Error('Spawn failed')), 10);
                }),
                killed: false,
                kill: jest.fn()
            };

            (spawn as jest.Mock).mockReturnValue(mockProcess);

            const result = await ScriptExecutor.execute('console.log()', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Spawn failed');
        });

        it('should pass database config to script', async () => {
            const mockProcess = {
                stdout: { on: jest.fn((e, cb) => { if (e === 'data') cb('ok'); }) },
                stderr: { on: jest.fn() },
                on: jest.fn((e, cb) => { if (e === 'close') setTimeout(() => cb(0), 10); }),
                killed: false,
                kill: jest.fn()
            };

            (spawn as jest.Mock).mockReturnValue(mockProcess);

            await ScriptExecutor.execute('script', {
                postgresUrl: 'postgresql://localhost:5432/test',
                mongoUrl: 'mongodb://localhost:27017',
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(spawn).toHaveBeenCalled();
            const spawnCall = (spawn as jest.Mock).mock.calls[0];
            expect(spawnCall[1].some((arg: string) => arg.includes('script.js'))).toBe(true);
        });

        it('should cleanup temp directory on error', async () => {
            (mkdtemp as jest.Mock).mockRejectedValue(new Error('Failed to create temp'));

            const result = await ScriptExecutor.execute('script', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.error).toBe('Failed to create temp');
        });

        it('should capture stderr when script succeeds but logs errors', async () => {
            (mkdtemp as jest.Mock).mockResolvedValue('/tmp/test-script-valid');

            const mockProcess = {
                stdout: {
                    on: jest.fn((event, cb) => {
                        if (event === 'data') cb('Success output');
                    })
                },
                stderr: {
                    on: jest.fn((event, cb) => {
                        if (event === 'data') cb('Warning message');
                    })
                },
                on: jest.fn((event, cb) => {
                    if (event === 'close') setTimeout(() => cb(0), 10);
                }),
                killed: false,
                kill: jest.fn()
            };

            (spawn as jest.Mock).mockReturnValue(mockProcess);

            const result = await ScriptExecutor.execute('console.log("test")', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            if (!result.success) {
                console.error('Test failed with error:', result.error);
            }
            expect(result.success).toBe(true);
            expect(result.output).toContain('Success output');
            expect(result.output).toContain('--- STDERR ---');
            expect(result.output).toContain('Warning message');
        });

        it('should kill process on timeout', async () => {
            const mockKill = jest.fn();
            const mockProcess = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(), // Never calls close
                killed: false,
                kill: mockKill
            };

            (spawn as jest.Mock).mockReturnValue(mockProcess);

            const executionPromise = ScriptExecutor.execute('while(true);', {
                databaseName: 'test',
                databaseType: 'postgres'
            });

            // Wait for timeout (50ms configured + buffer)
            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await executionPromise;

            expect(result.success).toBe(false);
            expect(result.error).toContain('timed out');
            expect(mockKill).toHaveBeenCalledWith('SIGTERM');
        });
    });
});
