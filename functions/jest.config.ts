import type { Config } from 'jest';
import { join } from 'path';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  moduleNameMapper: {
    '^@kudjo/shared$': '<rootDir>/../packages/shared/src/index',
    '^@kudjo/shared/(.*)$': '<rootDir>/../packages/shared/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: join(__dirname, 'tsconfig.json'),
    }],
  },
};
export default config; 