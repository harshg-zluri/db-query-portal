// Mock isolated-vm
const mockLogs: string[] = [];
const mockErrors: string[] = [];

jest.mock('isolated-vm', () => {
    return {
        Isolate: jest.fn().mockImplementation(() => ({
            createContext: jest.fn().mockResolvedValue({
                global: {
                    set: jest.fn().mockImplementation(async (name: string, value: unknown) => {
                        // Capture log/error callbacks for testing
                        if (name === '_log' && value && typeof (value as { call?: unknown }).call === 'function') {
                            (global as Record<string, unknown>).__testLog = value;
                        }
                        if (name === '_error' && value && typeof (value as { call?: unknown }).call === 'function') {
                            (global as Record<string, unknown>).__testError = value;
                        }
                    }),
                    derefInto: jest.fn()
                }
            }),
            compileScript: jest.fn().mockResolvedValue({
                run: jest.fn().mockResolvedValue(undefined)
            }),
            getHeapStatisticsSync: jest.fn().mockReturnValue({ used_heap_size: 1024 }),
            dispose: jest.fn()
        })),
        Callback: jest.fn().mockImplementation((fn) => ({ call: fn })),
        ExternalCopy: jest.fn().mockImplementation((data) => ({
            copyInto: () => data
        }))
    };
});

// Mock config
jest.mock('../../../src/config/environment', () => ({
    config: {
        scriptExecution: {
            timeoutMs: 5000,
            maxMemoryMb: 128
        }
    }
}));

import { ScriptExecutor } from '../../../src/services/script.executor';

describe('ScriptExecutor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLogs.length = 0;
        mockErrors.length = 0;
    });

    describe('validate', () => {
        it('should pass valid script', () => {
            const script = `
                const x = 1 + 1;
                console.log('Result:', x);
            `;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject require()', () => {
            const script = `const fs = require('fs');`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('require()');
        });

        it('should reject ES imports', () => {
            const script = `import fs from 'fs';`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('ES imports');
        });

        it('should reject process access', () => {
            const script = `process.exit(0);`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('process');
        });

        it('should reject child_process', () => {
            const script = `child_process.exec('ls');`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('child_process');
        });

        it('should reject fs access', () => {
            const script = `fs.readFileSync('/etc/passwd');`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('File system');
        });

        it('should reject eval', () => {
            const script = `eval('console.log(1)');`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('eval()');
        });

        it('should reject Function constructor', () => {
            const script = `new Function('return 1')();`;

            const result = ScriptExecutor.validate(script);

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Function constructor');
        });

        it('should collect multiple errors', () => {
            const script = `
                require('child_process');
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
            const result = await ScriptExecutor.execute('console.log("test")', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(true);
            expect(result.executedAt).toBeDefined();
        });

        it('should pass database config', async () => {
            const result = await ScriptExecutor.execute('console.log(DB_CONFIG)', {
                postgresUrl: 'postgresql://localhost:5432/test',
                mongoUrl: 'mongodb://localhost:27017',
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(true);
        });

        it('should handle script timeout', async () => {
            const ivm = require('isolated-vm');
            const mockRun = jest.fn().mockRejectedValue(new Error('Script execution timed out'));
            ivm.Isolate.mockImplementationOnce(() => ({
                createContext: jest.fn().mockResolvedValue({
                    global: { set: jest.fn(), derefInto: jest.fn() }
                }),
                compileScript: jest.fn().mockResolvedValue({ run: mockRun }),
                getHeapStatisticsSync: jest.fn().mockReturnValue({ used_heap_size: 0 }),
                dispose: jest.fn()
            }));

            const result = await ScriptExecutor.execute('while(true){}', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('timed out');
        });

        it('should handle memory limit exceeded', async () => {
            const ivm = require('isolated-vm');
            const mockRun = jest.fn().mockRejectedValue(new Error('Isolate was disposed'));
            ivm.Isolate.mockImplementationOnce(() => ({
                createContext: jest.fn().mockResolvedValue({
                    global: { set: jest.fn(), derefInto: jest.fn() }
                }),
                compileScript: jest.fn().mockResolvedValue({ run: mockRun }),
                getHeapStatisticsSync: jest.fn().mockReturnValue({ used_heap_size: 0 }),
                dispose: jest.fn()
            }));

            const result = await ScriptExecutor.execute('const arr = new Array(1e9);', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('memory limit');
        });

        it('should handle script errors', async () => {
            const ivm = require('isolated-vm');
            const mockRun = jest.fn().mockRejectedValue(new Error('ReferenceError: foo is not defined'));
            ivm.Isolate.mockImplementationOnce(() => ({
                createContext: jest.fn().mockResolvedValue({
                    global: { set: jest.fn(), derefInto: jest.fn() }
                }),
                compileScript: jest.fn().mockResolvedValue({ run: mockRun }),
                getHeapStatisticsSync: jest.fn().mockReturnValue({ used_heap_size: 0 }),
                dispose: jest.fn()
            }));

            const result = await ScriptExecutor.execute('foo.bar()', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('foo is not defined');
        });

        it('should always dispose isolate', async () => {
            const ivm = require('isolated-vm');
            const mockDispose = jest.fn();
            ivm.Isolate.mockImplementationOnce(() => ({
                createContext: jest.fn().mockResolvedValue({
                    global: { set: jest.fn(), derefInto: jest.fn() }
                }),
                compileScript: jest.fn().mockResolvedValue({
                    run: jest.fn().mockResolvedValue(undefined)
                }),
                getHeapStatisticsSync: jest.fn().mockReturnValue({ used_heap_size: 0 }),
                dispose: mockDispose
            }));

            await ScriptExecutor.execute('1+1', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(mockDispose).toHaveBeenCalled();
        });
        it('should handle complex log and error outputs', async () => {
            const ivm = require('isolated-vm');
            const mockRun = jest.fn().mockImplementation(async () => {
                // Manually trigger the captured callbacks
                // The global.__testLog is the { call: fn } object created by new ivm.Callback
                const globalScope = global as any;

                if (globalScope.__testLog) {
                    // Simulate console.log({ foo: 'bar' }, 'text')
                    globalScope.__testLog.call({ foo: 'bar' }, 'text');
                }

                if (globalScope.__testError) {
                    // Simulate console.error('Error obj', { err: true })
                    globalScope.__testError.call('Error obj', { err: true });
                }
            });

            ivm.Isolate.mockImplementationOnce(() => ({
                createContext: jest.fn().mockResolvedValue({
                    global: {
                        set: jest.fn().mockImplementation(async (name: string, value: any) => {
                            if (name === '_log') (global as any).__testLog = value;
                            if (name === '_error') (global as any).__testError = value;
                        }),
                        derefInto: jest.fn()
                    }
                }),
                compileScript: jest.fn().mockResolvedValue({ run: mockRun }),
                getHeapStatisticsSync: jest.fn().mockReturnValue({ used_heap_size: 0 }),
                dispose: jest.fn()
            }));

            const result = await ScriptExecutor.execute('console.log(...)', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(true);
            // Verify logs formatted correctly
            expect(result.output).toContain('{"foo":"bar"} text');
            // Verify errors included
            expect(result.output).toContain('--- STDERR ---');
            expect(result.output).toContain('Error obj {"err":true}');
        });
    });
});
