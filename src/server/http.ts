import "server-only";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { todayInTimeZone } from "@/lib/dates";
import { fieldErrors } from "@/lib/validation";
import { SESSION_COOKIE, validateSessionToken, type SessionUser } from "./auth/session";

// Shared plumbing for Route Handlers, so each route only contains its own
// logic and every error comes back in the same JSON shape:
//   { "error": "message", "fields"?: { "fieldName": "message" } }

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (what = "Not found.") => new HttpError(404, what);
export const conflict = (message: string, fields?: Record<string, string>) =>
  new HttpError(409, message, fields);

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message, fields: error.fields }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Database constraints are the last line of defence; translate them
    // rather than leaking a 500 if a race slips past the service checks.
    if (error.code === "P2002") return Response.json({ error: "That already exists." }, { status: 409 });
    if (error.code === "P2003") return Response.json({ error: "That item is still in use." }, { status: 409 });
    if (error.code === "P2025") return Response.json({ error: "Not found." }, { status: 404 });
  }
  console.error(error);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

/** Validate untrusted input or throw a 400 listing each bad field. */
export function parseInput<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, "Please fix the highlighted fields.", fieldErrors(result.error));
  }
  return result.data;
}

export function searchParamsObject(req: NextRequest): Record<string, string> {
  return Object.fromEntries(req.nextUrl.searchParams);
}

/** The caller's "today", from the time zone cookie their browser set. */
export function requestToday(req: NextRequest): string {
  return todayInTimeZone(req.cookies.get("tz")?.value ?? "UTC");
}

/** Route Handlers read the cookie from the request so they're testable without Next's runtime. */
export async function requireApiUser(req: NextRequest): Promise<SessionUser> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await validateSessionToken(token) : null;
  if (!user) throw new HttpError(401, "Please sign in.");
  return user;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Defence in depth alongside SameSite cookies: browsers always send Origin
 * on cross-site writes, so a mismatch means another site is submitting.
 */
function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || !MUTATING.has(req.method)) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origin).host !== host) throw new HttpError(403, "Cross-site request blocked.");
}

/** Wraps a Route Handler with the origin check and uniform error handling. */
export function route<Ctx = unknown>(
  handler: (req: NextRequest, ctx: Ctx) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
