// jest.config.ts
import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from '../tsconfig.json';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.spec.ts'],
  coverageDirectory: './coverage',
  testRegex: '.e2e-spec.ts$',
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths ?? {}, {
    prefix: '<rootDir>',
  }),
  rootDir: '../',
  globalSetup: './test/jest-global-setup.ts',
  globalTeardown: './test/jest-global-teardown.ts',
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'DocDash BackEnd - E2E Tests',
        outputPath: './tests-e2e-report.html',
      },
    ],
  ],
};

export default config;
