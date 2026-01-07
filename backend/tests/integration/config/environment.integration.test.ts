/**
 * Integration tests for environment configuration
 * Mock dotenv to prevent .env file from being loaded
 * This allows testing both branches of || operators
 */

// Mock dotenv BEFORE any imports
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

describe('Environment Config - Integration Tests', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
        jest.resetModules();
    });

    describe('testing env var fallback branches (|| operators)', () => {
        it('should use all defaults when no env vars are set', () => {
            // Set minimal process.env without any config-related vars
            process.env = { PATH: '/usr/bin' };

            jest.isolateModules(() => {
                const { config } = require('../../../src/config/environment');

                // Test all || fallback branches (the right side of ||)
                expect(config.port).toBe(3000);
                expect(config.nodeEnv).toBe('development');
                expect(config.jwt.secret).toBe('default-secret-change-me');
                expect(config.jwt.expiresIn).toBe('1h');
                expect(config.jwt.refreshExpiresIn).toBe('7d');
                expect(config.database.url).toBe('postgresql://postgres:password@localhost:5432/db_query_portal');
                expect(config.rateLimit.windowMs).toBe(900000);
                expect(config.rateLimit.maxRequests).toBe(1000);
                expect(config.rateLimit.authMaxRequests).toBe(100);
                expect(config.scriptExecution.timeoutMs).toBe(30000);
                expect(config.scriptExecution.maxMemoryMb).toBe(128);
            });
        });

        it('should use custom values when env vars are set', () => {
            // Set all env vars to custom values
            process.env = {
                PATH: '/usr/bin',
                PORT: '5000',
                NODE_ENV: 'production',
                JWT_SECRET: 'custom-secret',
                JWT_EXPIRES_IN: '2h',
                JWT_REFRESH_EXPIRES_IN: '14d',
                DATABASE_URL: 'postgresql://custom@localhost:5432/custom_db',
                RATE_LIMIT_WINDOW_MS: '60000',
                RATE_LIMIT_MAX_REQUESTS: '500',
                AUTH_RATE_LIMIT_MAX: '50',
                SCRIPT_TIMEOUT_MS: '60000',
                SCRIPT_MAX_MEMORY_MB: '256'
            };

            jest.isolateModules(() => {
                const { config } = require('../../../src/config/environment');

                // Test all || fallback branches (the left side of ||)
                expect(config.port).toBe(5000);
                expect(config.nodeEnv).toBe('production');
                expect(config.jwt.secret).toBe('custom-secret');
                expect(config.jwt.expiresIn).toBe('2h');
                expect(config.jwt.refreshExpiresIn).toBe('14d');
                expect(config.database.url).toBe('postgresql://custom@localhost:5432/custom_db');
                expect(config.rateLimit.windowMs).toBe(60000);
                expect(config.rateLimit.maxRequests).toBe(500);
                expect(config.rateLimit.authMaxRequests).toBe(50);
                expect(config.scriptExecution.timeoutMs).toBe(60000);
                expect(config.scriptExecution.maxMemoryMb).toBe(256);
            });
        });
    });

    describe('validateConfig', () => {
        it('should throw in production when JWT_SECRET is default', () => {
            process.env = {
                PATH: '/usr/bin',
                NODE_ENV: 'production'
                // JWT_SECRET not set -> will use default
            };

            jest.isolateModules(() => {
                const { validateConfig } = require('../../../src/config/environment');
                expect(() => validateConfig()).toThrow('JWT_SECRET must be set in production');
            });
        });

        it('should not throw in production when JWT_SECRET is set', () => {
            process.env = {
                PATH: '/usr/bin',
                NODE_ENV: 'production',
                JWT_SECRET: 'production-secret-key'
            };

            jest.isolateModules(() => {
                const { validateConfig } = require('../../../src/config/environment');
                expect(() => validateConfig()).not.toThrow();
            });
        });

        it('should not throw in development mode', () => {
            process.env = {
                PATH: '/usr/bin',
                NODE_ENV: 'development'
            };

            jest.isolateModules(() => {
                const { validateConfig } = require('../../../src/config/environment');
                expect(() => validateConfig()).not.toThrow();
            });
        });

        it('should not throw when NODE_ENV is not production', () => {
            process.env = {
                PATH: '/usr/bin'
                // NODE_ENV not set -> defaults to 'development'
            };

            jest.isolateModules(() => {
                const { validateConfig } = require('../../../src/config/environment');
                expect(() => validateConfig()).not.toThrow();
            });
        });
    });
});
