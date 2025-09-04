import type { Config } from 'jest';

const config: Config = {
  projects: [
    '<rootDir>/functions',
    {
      displayName: 'unit-tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
    },
    {
      displayName: 'integration-tests', 
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
    },
    {
      displayName: 'security-tests',
      testMatch: ['<rootDir>/tests/security/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
    }
  ],
};
export default config; 