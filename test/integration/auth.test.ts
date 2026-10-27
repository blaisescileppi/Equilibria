import { beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { prisma } from "@/lib/db";
import { hashToken, SESSION_COOKIE } from "@/server/auth/session";
import { json, makeRequest, resetDb } from "../helpers";

beforeEach(resetDb);

function sessionTokenFrom(res: Response): string | undefined {
  const header = res.headers.get("set-cookie") ?? "";
  return header.match(new RegExp(`${SESSION_COOKIE}=([^;]*)`))?.[1];
}

const signupBody = {
  email: "Ada@Example.com",
  password: "correct horse battery",
  displayName: "Ada",
};

describe("POST /api/auth/signup", () => {
  it("creates the user and a session, storing only hashes", async () => {
    const res = await signup(makeRequest("/api/auth/signup", { method: "POST", body: signupBody }), {});
    expect(res.status).toBe(201);

    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ada@example.com" } });
    expect(user.passwordHash).not.toContain("correct horse");

    const token = sessionTokenFrom(res)!;
    const session = await prisma.session.findUnique({ where: { id: hashToken(token) } });
    expect(session?.userId).toBe(user.id);
    // The raw token itself is never stored.
    expect(await prisma.session.findUnique({ where: { id: token } })).toBeNull();
  });

  it("rejects a duplicate email regardless of case", async () => {
    await signup(makeRequest("/api/auth/signup", { method: "POST", body: signupBody }), {});
    const res = await signup(
      makeRequest("/api/auth/signup", {
        method: "POST",
        body: { ...signupBody, email: "ADA@example.com" },
      }),
      {},
    );
    expect(res.status).toBe(409);
    expect(await prisma.user.count()).toBe(1);
  });

  it("returns field errors for invalid input", async () => {
    const res = await signup(
      makeRequest("/api/auth/signup", {
        method: "POST",
        body: { email: "nope", password: "123", displayName: "" },
      }),
      {},
    );
    expect(res.status).toBe(400);
    const body = await json<{ fields: Record<string, string> }>(res);
    expect(Object.keys(body.fields).sort()).toEqual(["displayName", "email", "password"]);
  });

  it("rejects malformed JSON", async () => {
    const res = await signup(makeRequest("/api/auth/signup", { method: "POST", body: "{oops" }), {});
    expect(res.status).toBe(400);
  });

  it("blocks cross-site requests", async () => {
    const res = await signup(
      makeRequest("/api/auth/signup", {
        method: "POST",
        body: signupBody,
        headers: { origin: "https://evil.example", host: "localhost:3000" },
      }),
      {},
    );
    expect(res.status).toBe(403);
    expect(await prisma.user.count()).toBe(0);
  });
});

describe("POST /api/auth/login and /logout", () => {
  beforeEach(async () => {
    await signup(makeRequest("/api/auth/signup", { method: "POST", body: signupBody }), {});
  });

  it("signs in with the right password", async () => {
    const res = await login(
      makeRequest("/api/auth/login", {
        method: "POST",
        body: { email: "ada@example.com", password: signupBody.password },
      }),
      {},
    );
    expect(res.status).toBe(200);
    expect(sessionTokenFrom(res)).toBeTruthy();
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    const wrong = await login(
      makeRequest("/api/auth/login", {
        method: "POST",
        body: { email: "ada@example.com", password: "wrong password" },
      }),
      {},
    );
    const unknown = await login(
      makeRequest("/api/auth/login", {
        method: "POST",
        body: { email: "nobody@example.com", password: "whatever123" },
      }),
      {},
    );
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await json(wrong)).toEqual(await json(unknown));
  });

  it("logout deletes the session row and clears the cookie", async () => {
    const res = await login(
      makeRequest("/api/auth/login", {
        method: "POST",
        body: { email: "ada@example.com", password: signupBody.password },
      }),
      {},
    );
    const token = sessionTokenFrom(res)!;
    const before = await prisma.session.count();

    const out = await logout(makeRequest("/api/auth/logout", { method: "POST", token }), {});
    expect(out.status).toBe(200);
    expect(sessionTokenFrom(out)).toBe("");
    expect(await prisma.session.count()).toBe(before - 1);
    expect(await prisma.session.findUnique({ where: { id: hashToken(token) } })).toBeNull();
  });
});
