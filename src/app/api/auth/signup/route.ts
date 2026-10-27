import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { hashPassword } from "@/server/auth/password";
import { createSession, sessionCookie } from "@/server/auth/session";
import { conflict, parseInput, readJson, route } from "@/server/http";

export const POST = route(async (req) => {
  const input = parseInput(signupSchema, await readJson(req));
  // Hash before opening the transaction so the slow step doesn't hold it open.
  const passwordHash = await hashPassword(input.password);

  try {
    // User and session are created together or not at all, so a failure
    // can never leave an account without a way to sign in.
    const session = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, passwordHash, displayName: input.displayName },
      });
      return createSession(user.id, tx);
    });

    const res = NextResponse.json({ ok: true }, { status: 201 });
    res.cookies.set(sessionCookie(session.token, session.expiresAt));
    return res;
  } catch (error) {
    // Relying on the unique index (not a "does it exist?" query first)
    // means two simultaneous signups can't both succeed.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("An account with this email already exists.", {
        email: "This email is already registered.",
      });
    }
    throw error;
  }
});
