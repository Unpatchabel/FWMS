/**
 * The test suite runs against a disposable SQLite file, never the real
 * `prisma/dev.db`. global-setup.ts deletes and re-creates this file fresh
 * before every test run; vitest.config.ts sets DATABASE_URL to this same
 * value for the whole test process, so every service function under test —
 * which all import the ordinary `@/lib/prisma` singleton — transparently
 * talks to this file instead of your real data.
 */
export const TEST_DATABASE_URL = "file:./prisma/test.db";
export const TEST_DATABASE_PATH = "./prisma/test.db";
