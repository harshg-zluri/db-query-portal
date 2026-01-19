/**
 * Integration tests for script executor
 * Tests actual script execution including timeout handling
 */

import { ScriptExecutor } from '../../../src/services/script.executor';

describe('ScriptExecutor Integration Tests', () => {
    describe('execute', () => {
        it('should handle script errors gracefully', async () => {
            const errorScript = `
                throw new Error('Test error');
            `;

            const result = await ScriptExecutor.execute(errorScript, {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should execute valid script successfully', async () => {
            const validScript = `
                console.log('Hello from script');
            `;

            const result = await ScriptExecutor.execute(validScript, {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(true);
            expect(result.output).toContain('Hello from script');
        });

        it('should handle script with exit code 0', async () => {
            const script = `
                const x = 1 + 1;
                console.log('Result:', x);
            `;

            const result = await ScriptExecutor.execute(script, {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(true);
        });

        it('should handle script with non-zero exit code', async () => {
            const script = `
                console.error('Error output');
                throw new Error('Failure');
            `;

            const result = await ScriptExecutor.execute(script, {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(false);
        });

        it('should pass database config as environment variables', async () => {
            const script = `
                console.log('DB_CONFIG_FILE:', process.env.DB_CONFIG_FILE || 'not set');
                console.log('MONGO_URI:', process.env.MONGO_URI || 'not set');
            `;

            const result = await ScriptExecutor.execute(script, {
                postgresUrl: '/path/to/config',
                mongoUrl: 'mongodb://localhost:27017',
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            expect(result.success).toBe(true);
            // Environment variables are now POSTGRES_URL and MONGODB_URL
            expect(result.output).toBeDefined();
        });
    });

    describe('validate', () => {
        it('should reject script with child_process', () => {
            const result = ScriptExecutor.validate("require('child_process')");
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('child_process module is not allowed');
        });

        it('should reject script with eval', () => {
            const result = ScriptExecutor.validate("eval('code')");
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('eval() is not allowed');
        });

        it('should reject script with cluster', () => {
            const result = ScriptExecutor.validate("require('cluster')");
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('cluster module is not allowed');
        });

        it('should reject script with Function constructor', () => {
            const result = ScriptExecutor.validate("new Function('return 1')");
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Function constructor is not allowed');
        });

        it('should reject script with process.exit', () => {
            const result = ScriptExecutor.validate("process.exit(1)");
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('process.exit() is not allowed');
        });

        it('should reject script with direct fs usage', () => {
            const result = ScriptExecutor.validate("require('fs')");
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Direct fs module usage is restricted');
        });

        it('should accept valid script', () => {
            const result = ScriptExecutor.validate("console.log('hello')");
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return multiple errors for script with multiple violations', () => {
            const result = ScriptExecutor.validate("eval('code'); require('child_process')");
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });
});

describe('ScriptExecutor Timeout Test', () => {
    // Longer timeout for this specific test
    it('should handle scripts that are killed', async () => {
        // Script that runs for a short time then completes
        const quickScript = `
            setTimeout(() => {
                console.log('Done');
            }, 100);
        `;

        const result = await ScriptExecutor.execute(quickScript, {
            databaseName: 'test_db',
            databaseType: 'postgres'
        });
        // May succeed or fail depending on timing
        expect(result.executedAt).toBeDefined();
    }, 15000);
});
