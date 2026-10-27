import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/server/auth/password";
import { createSession, sessionCookie } from "@/server/auth/session";
import { HttpError, parseInput, readJson, route } from "@/server/http";

export const POST = route(async (req) => {
  const { email, password } = parseInput(loginSchema, await readJson(req));

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? null);

  // Same message either way, so the response doesn't reveal which emails exist.
  if (!user || !valid) throw new HttpError(401, "Incorrect email or password.");

  const session = await createSession(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(session.token, session.expiresAt));
  return res;
});
