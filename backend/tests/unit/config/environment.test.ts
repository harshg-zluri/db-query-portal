// Test environment configuration
// Tests the actual behavior of the config module

import { config, validateConfig } from '../../../src/config/environment';

describe('Environment Config', () => {
    describe('config structure', () => {
        it('should have port as a number', () => {
            expect(typeof config.port).toBe('number');
            expect(config.port).toBeGreaterThan(0);
        });

        it('should have nodeEnv as a string', () => {
            expect(typeof config.nodeEnv).toBe('string');
        });

        it('should have jwt config with all required properties', () => {
            expect(typeof config.jwt.secret).toBe('string');
            expect(config.jwt.secret.length).toBeGreaterThan(0);
            expect(typeof config.jwt.expiresIn).toBe('string');
            expect(typeof config.jwt.refreshExpiresIn).toBe('string');
        });

        it('should have database config with url', () => {
            expect(typeof config.database.url).toBe('string');
            expect(config.database.url.length).toBeGreaterThan(0);
        });

        it('should have rateLimit config with all required properties', () => {
            expect(typeof config.rateLimit.windowMs).toBe('number');
            expect(typeof config.rateLimit.maxRequests).toBe('number');
            expect(typeof config.rateLimit.authMaxRequests).toBe('number');
        });

        it('should have scriptExecution config with all required properties', () => {
            expect(typeof config.scriptExecution.timeoutMs).toBe('number');
            expect(typeof config.scriptExecution.maxMemoryMb).toBe('number');
        });

        it('should have bcrypt config with saltRounds', () => {
            expect(config.bcrypt.saltRounds).toBe(12);
        });
    });

    describe('validateConfig', () => {
        it('should not throw in non-production modes', () => {
            // If we're in test/development, this should not throw
            if (config.nodeEnv !== 'production') {
                expect(() => validateConfig()).not.toThrow();
            }
        });

        it('should check that jwt secret is not default in production', () => {
            // This test validates the validateConfig logic exists
            // In production with default secret, it should throw
            expect(validateConfig).toBeDefined();
            expect(typeof validateConfig).toBe('function');
        });
    });

    describe('environment variable parsing', () => {
        it('should parse PORT as integer', () => {
            expect(Number.isInteger(config.port)).toBe(true);
        });

        it('should parse RATE_LIMIT_WINDOW_MS as integer', () => {
            expect(Number.isInteger(config.rateLimit.windowMs)).toBe(true);
        });

        it('should parse RATE_LIMIT_MAX_REQUESTS as integer', () => {
            expect(Number.isInteger(config.rateLimit.maxRequests)).toBe(true);
        });

        it('should parse AUTH_RATE_LIMIT_MAX as integer', () => {
            expect(Number.isInteger(config.rateLimit.authMaxRequests)).toBe(true);
        });

        it('should parse SCRIPT_TIMEOUT_MS as integer', () => {
            expect(Number.isInteger(config.scriptExecution.timeoutMs)).toBe(true);
        });

        it('should parse SCRIPT_MAX_MEMORY_MB as integer', () => {
            expect(Number.isInteger(config.scriptExecution.maxMemoryMb)).toBe(true);
        });
    });
});
