import { beforeEach, describe, expect, it } from "vitest";
import { DELETE, PUT } from "@/app/api/logs/[id]/route";
import { GET, POST } from "@/app/api/logs/route";
import { prisma } from "@/lib/db";
import { createUser, json, makeRequest, params, resetDb } from "../helpers";

beforeEach(resetDb);

type LogBody = { log: { id: string; date: string; mood: string; symptoms: string[]; notes: string | null } };

const entry = {
  date: "2026-10-12",
  mood: "LOW",
  symptoms: ["CRAMPS", "FATIGUE"],
  notes: "Rough afternoon.",
};

async function addLog(token: string, body: unknown) {
  return POST(makeRequest("/api/logs", { method: "POST", token, body }), {});
}

describe("/api/logs", () => {
  it("creates a log and lists it for its month", async () => {
    const { token } = await createUser();
    const res = await addLog(token, entry);
    expect(res.status).toBe(201);
    expect((await json<LogBody>(res)).log).toMatchObject(entry);

    await addLog(token, { ...entry, date: "2026-11-01" }); // different month

    const list = await GET(makeRequest("/api/logs?month=2026-10", { token }), {});
    const body = await json<{ logs: { date: string }[] }>(list);
    expect(body.logs.map((l) => l.date)).toEqual(["2026-10-12"]);
  });

  it("allows only one log per day", async () => {
    const { token } = await createUser();
    await addLog(token, entry);
    const res = await addLog(token, { ...entry, mood: "GOOD" });
    expect(res.status).toBe(409);
    expect(await prisma.dailyLog.count()).toBe(1);
  });

  it("validates mood, symptoms, and the month filter", async () => {
    const { token } = await createUser();
    expect((await addLog(token, { ...entry, mood: "MEH" })).status).toBe(400);
    expect((await addLog(token, { ...entry, symptoms: ["HICCUPS"] })).status).toBe(400);
    expect((await addLog(token, { ...entry, notes: "x".repeat(2001) })).status).toBe(400);
    expect((await GET(makeRequest("/api/logs?month=2026-13", { token }), {})).status).toBe(400);
  });
});

describe("/api/logs/[id]", () => {
  it("edits and deletes a log", async () => {
    const { token } = await createUser();
    const { log } = await json<LogBody>(await addLog(token, entry));

    const res = await PUT(
      makeRequest(`/api/logs/${log.id}`, {
        method: "PUT",
        token,
        body: { ...entry, mood: "GOOD", symptoms: [], notes: "" },
      }),
      params({ id: log.id }),
    );
    expect(res.status).toBe(200);
    expect((await json<LogBody>(res)).log).toMatchObject({ mood: "GOOD", symptoms: [], notes: null });

    const del = await DELETE(makeRequest(`/api/logs/${log.id}`, { method: "DELETE", token }), params({ id: log.id }));
    expect(del.status).toBe(204);
    expect(await prisma.dailyLog.count()).toBe(0);
  });

  it("won't move a log onto a day that already has one", async () => {
    const { token } = await createUser();
    await addLog(token, entry);
    const { log } = await json<LogBody>(await addLog(token, { ...entry, date: "2026-10-13" }));

    const res = await PUT(
      makeRequest(`/api/logs/${log.id}`, { method: "PUT", token, body: entry }),
      params({ id: log.id }),
    );
    expect(res.status).toBe(409);
  });

  it("hides other users' logs", async () => {
    const owner = await createUser();
    const other = await createUser();
    const { log } = await json<LogBody>(await addLog(owner.token, entry));

    const del = await DELETE(
      makeRequest(`/api/logs/${log.id}`, { method: "DELETE", token: other.token }),
      params({ id: log.id }),
    );
    expect(del.status).toBe(404);
    expect(await prisma.dailyLog.count()).toBe(1);
  });
});
