/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js'
    ],
    coverageDirectory: 'coverage',
    verbose: true,
    testTimeout: 10000,
    // Don't run tests in parallel (DB conflicts)
    maxWorkers: 1,
    // Setup file for mocks
    setupFilesAfterEnv: ['./tests/setup.js']
};
