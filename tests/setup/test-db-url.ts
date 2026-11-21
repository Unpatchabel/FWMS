import { resolve } from "node:path";
export const TEST_DATABASE_PATH = resolve("prisma/test.db");
export const TEST_DATABASE_URL = `file:${TEST_DATABASE_PATH.replace(/\\/g, "/")}`;
