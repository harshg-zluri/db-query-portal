// Test setup file
import { jest, afterAll } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock database
// Mock database
jest.mock('../src/config/database', () => ({
    getPool: jest.fn(),
    closeDatabase: jest.fn(),
    initDatabase: jest.fn(),
    getEm: jest.fn(),
    getOrm: jest.fn(),
}));

// Mock logger to suppress output during tests
jest.mock('../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    },
    LogLevel: {
        DEBUG: 'DEBUG',
        INFO: 'INFO',
        WARN: 'WARN',
        ERROR: 'ERROR'
    }
}));

// Global test timeout
jest.setTimeout(10000);

// Clean up after tests
afterAll(async () => {
    jest.clearAllMocks();
});
