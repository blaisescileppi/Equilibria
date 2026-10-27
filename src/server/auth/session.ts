import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "equilibria_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type SessionUser = { id: string; email: string; displayName: string };

// Anything with a `session` delegate: the shared client or a transaction.
type SessionDb = Pick<typeof prisma, "session">;

/** 32 random bytes is far beyond guessable. base64url is cookie-safe. */
function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this hash is stored, never the token the browser holds. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, db: SessionDb = prisma) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  const id = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    // deleteMany doesn't throw if another request already removed it.
    await prisma.session.deleteMany({ where: { id } });
    return null;
  }
  return session.user;
}

export async function invalidateSessionToken(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}

const baseCookie = {
  httpOnly: true, // page JavaScript can't read it, which blunts XSS token theft
  sameSite: "lax" as const, // not sent on cross-site POSTs, which blocks CSRF
  secure: process.env.NODE_ENV === "production", // HTTPS-only once deployed
  path: "/",
};

export function sessionCookie(token: string, expiresAt: Date) {
  return { name: SESSION_COOKIE, value: token, ...baseCookie, expires: expiresAt };
}

export function clearedSessionCookie() {
  return { name: SESSION_COOKIE, value: "", ...baseCookie, expires: new Date(0) };
}
