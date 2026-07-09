import bcrypt from "bcryptjs";

/**
 * Password hashing. bcrypt is deliberately slow to resist brute force.
 * Cost factor 12 is a sensible default for a small self-hosted app.
 */
const COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
