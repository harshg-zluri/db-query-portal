import { ScriptExecutor } from '../../src/services/script.executor';
import { ExecutionResult } from '../../src/types';
import { config } from '../../src/config/environment';

describe('ScriptExecutor Security', () => {
    // Mock config to ensure timeouts don't make tests flaky
    const originalTimeout = config.scriptExecution.timeoutMs;

    beforeAll(() => {
        config.scriptExecution.timeoutMs = 5000;
        // Set a sensitive dummy env var to test leakage
        process.env.SENSITIVE_SECRET = 'super-secret-password';
    });

    afterAll(() => {
        config.scriptExecution.timeoutMs = originalTimeout;
        delete process.env.SENSITIVE_SECRET;
    });

    it('should NOT leak backend environment variables to the script', async () => {
        const scriptContent = `
            console.log(JSON.stringify(process.env));
        `;

        const dbConfig = {
            databaseName: 'test_db',
            databaseType: 'postgresql'
        };

        const result: ExecutionResult = await ScriptExecutor.execute(scriptContent, dbConfig);

        if (!result.success) {
            console.error('Execution Error:', result.error);
            console.error('Execution Output:', result.output);
        }
        expect(result.success).toBe(true);
        const env = JSON.parse(result.output || '{}');

        // Assert that the sensitive secret is NOT present
        expect(env.SENSITIVE_SECRET).toBeUndefined();

        // Assert that we only have expected variables
        expect(env.NODE_ENV).toBe('production');
        expect(env.DB_NAME).toBe('test_db');
    });

    it('should inject correct database configuration', async () => {
        const scriptContent = `
            console.log(process.env.POSTGRES_URL);
            console.log(process.env.DB_NAME);
        `;

        const dbConfig = {
            postgresUrl: 'postgres://user:pass@localhost:5432/db',
            databaseName: 'test_db',
            databaseType: 'postgresql'
        };

        const result: ExecutionResult = await ScriptExecutor.execute(scriptContent, dbConfig);

        expect(result.success).toBe(true);
        expect(result.output).toContain('postgres://user:pass@localhost:5432/db');
        expect(result.output).toContain('test_db');
    });

    it('should block dangerous Node.js modules via validation', async () => {
        const scriptContent = `
            const fs = require('fs');
            fs.readFileSync('/etc/passwd');
        `;

        const validation = ScriptExecutor.validate(scriptContent);
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Direct fs module usage is restricted');
    });

    // This test verifies that even if validation is bypassed (e.g. via evasive syntax),
    // the runtime sandboxing (NODE_PATH restriction) prevents loading the module
    it('should fail to require restricted modules at runtime', async () => {
        // Use evasive syntax to bypass regex validation
        const scriptContent = `
            try {
                const r = 'req' + 'uire';
                const f = 'f' + 's';
                const fs = global[r](f);
                console.log('FS loaded');
            } catch (e) {
                console.log('Error: ' + e.message);
            }
        `;

        const dbConfig = {
            databaseName: 'test_db',
            databaseType: 'postgresql'
        };

        const result: ExecutionResult = await ScriptExecutor.execute(scriptContent, dbConfig);
        expect(result.success).toBe(true);
        expect(result.output).not.toContain('FS loaded');
        expect(result.output).toContain('Error');
        expect(result.output).toContain('Error');
    });

    it('should handle script timeouts', async () => {
        // Infinite loop script
        const scriptContent = `
            while(true) {}
        `;

        // Override timeout for this specific test inside the class or config if possible, 
        // but we set it in beforeAll to 5000ms. 
        // We can temporarily set it lower for this test to be fast.
        config.scriptExecution.timeoutMs = 1000;

        const dbConfig = {
            databaseName: 'test_db',
            databaseType: 'postgresql'
        };

        const result: ExecutionResult = await ScriptExecutor.execute(scriptContent, dbConfig);

        // Reset timeout
        config.scriptExecution.timeoutMs = 5000;

        expect(result.success).toBe(false);
        expect(result.error).toContain('timed out');
    });

    it('should handle script runtime errors (non-zero exit)', async () => {
        const scriptContent = `
            throw new Error('Boom');
        `;

        const dbConfig = {
            databaseName: 'test_db',
            databaseType: 'postgresql'
        };

        const result: ExecutionResult = await ScriptExecutor.execute(scriptContent, dbConfig);

        expect(result.error).toContain('Boom');
    });

    it('should capture stderr on success', async () => {
        const scriptContent = `
            console.error('This is a warning');
            console.log('Success');
        `;

        const dbConfig = {
            databaseName: 'test_db',
            databaseType: 'postgresql'
        };

        const result: ExecutionResult = await ScriptExecutor.execute(scriptContent, dbConfig);

        expect(result.success).toBe(true);
        expect(result.output).toContain('Success');
        expect(result.output).toContain('--- STDERR ---');
        expect(result.output).toContain('This is a warning');
    });
});
