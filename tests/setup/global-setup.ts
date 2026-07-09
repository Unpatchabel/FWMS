import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { TEST_DATABASE_URL, TEST_DATABASE_PATH } from "./test-db-url";

/**
 * Runs once before the entire test suite (see vitest.config.ts's
 * `globalSetup`). Deletes any leftover test database file and pushes the
 * current Prisma schema to a fresh one, so every test run starts from a
 * known-clean, up-to-date schema — no stale data, no drift from the real
 * schema.prisma.
 */
export default async function globalSetup() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const path = `${TEST_DATABASE_PATH}${suffix}`;
    if (existsSync(path)) rmSync(path);
  }

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}
