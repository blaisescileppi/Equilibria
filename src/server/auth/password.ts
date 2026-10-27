import "server-only";
import bcrypt from "bcryptjs";

// Cost 12 takes roughly 250ms per hash: slow enough to make guessing
// expensive, fast enough for a login. Tests use the minimum to stay quick.
const ROUNDS = process.env.NODE_ENV === "test" ? 4 : 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

let dummyHash: Promise<string> | undefined;

/**
 * Compares against a throwaway hash when the account doesn't exist, so
 * "unknown email" and "wrong password" take the same time and an attacker
 * can't use response timing to discover which emails are registered.
 */
export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  dummyHash ??= bcrypt.hash("equilibria-timing-equalizer", ROUNDS);
  const matches = await bcrypt.compare(password, hash ?? (await dummyHash));
  return hash !== null && matches;
}
