import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts'],
    globalSetup: ['server/tests/global-setup.ts'],
    env: { NODE_ENV: 'test' },
    // Tests share one Postgres database; run files serially so truncation can't race.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
