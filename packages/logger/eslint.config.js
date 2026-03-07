import { config } from '@x-console/eslint-config/base.js';

/**
 * ESLint 9 Flat Config for @x-console/logger
 */
export default [
  ...config,

  // 忽略构建产物
  {
    ignores: ['lib/**', 'dist/**', 'build/**', 'coverage/**', 'node_modules/**'],
  },
];
