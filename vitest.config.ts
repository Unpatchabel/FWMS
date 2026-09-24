import { defineConfig } from "vitest/config";
import path from "node:path";
import { TEST_DATABASE_URL } from "./tests/setup/test-db-url";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globalSetup: "./tests/setup/global-setup.ts",
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      // Only needs to satisfy lib/session.ts's length check; nothing in the
      // test suite actually issues or verifies a session token.
      AUTH_SECRET: "test-only-secret-not-used-for-real-auth-1234567890",
    },
    // Integration tests share ONE SQLite file across the whole run. SQLite
    // handles concurrent writers poorly (SQLITE_BUSY under real parallelism),
    // so tests run in a single thread rather than racing each other — at this
    // suite's size that costs a couple of seconds, not something worth
    // fighting SQLite over.
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 15000,
  },
});
