import { NextResponse } from "next/server";
import {
  clearedSessionCookie,
  invalidateSessionToken,
  SESSION_COOKIE,
} from "@/server/auth/session";
import { route } from "@/server/http";

export const POST = route(async (req) => {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  // Deleting the row (not just the cookie) means a copied cookie stops
  // working too.
  if (token) await invalidateSessionToken(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearedSessionCookie());
  return res;
});
