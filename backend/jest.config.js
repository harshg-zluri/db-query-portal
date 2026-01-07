/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/app.ts',
        '!src/types/**/*.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 60,
            lines: 75,
            statements: 75
        }
    },
    coverageReporters: ['text', 'lcov', 'html'],
    coverageDirectory: 'coverage',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    verbose: true
};
