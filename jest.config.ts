
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^../../../db/schema$': '<rootDir>/client/src/types/schema'
  },
  setupFilesAfterEnv: ['<rootDir>/client/src/setupTests.ts'],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)']
};

export default config;
