import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/server/auth/password";
import { createSession, SESSION_COOKIE } from "@/server/auth/session";

// Helpers for integration tests that call Route Handlers directly with a
// real Request object and a real (test) database.

const TABLES = [
  "PostFavorite",
  "PostLike",
  "MealPost",
  "MealEntry",
  "Food",
  "DailyLog",
  "Cycle",
  "Session",
  "User",
];

export async function resetDb() {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

let userCount = 0;

/** Creates a user with a live session and returns the cookie token. */
export async function createUser(overrides: { email?: string; displayName?: string } = {}) {
  userCount += 1;
  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? `user${userCount}@example.com`,
      displayName: overrides.displayName ?? `User ${userCount}`,
      passwordHash: await hashPassword("password123"),
    },
  });
  const { token } = await createSession(user.id);
  return { user, token };
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
};

export function makeRequest(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  if (options.token) headers.set("cookie", `${SESSION_COOKIE}=${options.token}`);

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: options.method ?? "GET",
    headers,
    body,
  });
}

/** Builds the `{ params }` context argument that Next passes to dynamic routes. */
export function params<T extends Record<string, string>>(values: T) {
  return { params: Promise.resolve(values) };
}

export async function json<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
