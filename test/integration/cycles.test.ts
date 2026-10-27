import { beforeEach, describe, expect, it } from "vitest";
import { DELETE, PUT } from "@/app/api/cycles/[id]/route";
import { GET, POST } from "@/app/api/cycles/route";
import { prisma } from "@/lib/db";
import { createUser, json, makeRequest, params, resetDb } from "../helpers";

beforeEach(resetDb);

type CycleBody = { cycle: { id: string; startDate: string; endDate: string | null } };

async function addCycle(token: string, body: unknown) {
  return POST(makeRequest("/api/cycles", { method: "POST", token, body }), {});
}

describe("/api/cycles", () => {
  it("requires a signed-in user", async () => {
    const res = await GET(makeRequest("/api/cycles"), {});
    expect(res.status).toBe(401);
  });

  it("creates periods and returns insights computed from them", async () => {
    const { token } = await createUser();
    for (const [startDate, endDate] of [
      ["2026-07-01", "2026-07-05"],
      ["2026-07-29", "2026-08-02"],
      ["2026-08-26", "2026-08-30"],
    ]) {
      expect((await addCycle(token, { startDate, endDate })).status).toBe(201);
    }

    const res = await GET(makeRequest("/api/cycles", { token }), {});
    const body = await json<{
      cycles: { startDate: string }[];
      insights: { averageCycleLength: number; predictedNextStart: string };
    }>(res);
    expect(body.cycles.map((c) => c.startDate)).toEqual(["2026-08-26", "2026-07-29", "2026-07-01"]);
    expect(body.insights.averageCycleLength).toBe(28);
    expect(body.insights.predictedNextStart).toBe("2026-09-23");
  });

  it("rejects invalid dates with field errors", async () => {
    const { token } = await createUser();
    const res = await addCycle(token, { startDate: "2026-10-05", endDate: "2026-10-01" });
    expect(res.status).toBe(400);
    expect((await json<{ fields: object }>(res)).fields).toHaveProperty("endDate");
  });

  it("rejects overlapping periods", async () => {
    const { token } = await createUser();
    await addCycle(token, { startDate: "2026-10-01", endDate: "2026-10-05" });
    const res = await addCycle(token, { startDate: "2026-10-04", endDate: "2026-10-07" });
    expect(res.status).toBe(409);
    expect(await prisma.cycle.count()).toBe(1);
  });

  it("allows only one ongoing period, and it must be the latest", async () => {
    const { token } = await createUser();
    await addCycle(token, { startDate: "2026-09-01" });
    expect((await addCycle(token, { startDate: "2026-09-29" })).status).toBe(409);
    // Back-filling an older, finished period is still fine.
    expect((await addCycle(token, { startDate: "2026-08-01", endDate: "2026-08-04" })).status).toBe(201);
  });

  it("keeps two users' periods separate", async () => {
    const a = await createUser();
    const b = await createUser();
    await addCycle(a.token, { startDate: "2026-10-01", endDate: "2026-10-04" });
    // Same dates for another user is not an overlap.
    expect((await addCycle(b.token, { startDate: "2026-10-01", endDate: "2026-10-04" })).status).toBe(201);

    const res = await GET(makeRequest("/api/cycles", { token: b.token }), {});
    expect((await json<{ cycles: unknown[] }>(res)).cycles).toHaveLength(1);
  });
});

describe("/api/cycles/[id]", () => {
  it("updates and deletes the owner's period", async () => {
    const { token } = await createUser();
    const created = await json<CycleBody>(await addCycle(token, { startDate: "2026-10-01" }));
    const id = created.cycle.id;

    const updated = await PUT(
      makeRequest(`/api/cycles/${id}`, {
        method: "PUT",
        token,
        body: { startDate: "2026-10-01", endDate: "2026-10-06" },
      }),
      params({ id }),
    );
    expect(updated.status).toBe(200);
    expect((await json<CycleBody>(updated)).cycle.endDate).toBe("2026-10-06");

    const deleted = await DELETE(
      makeRequest(`/api/cycles/${id}`, { method: "DELETE", token }),
      params({ id }),
    );
    expect(deleted.status).toBe(204);
    expect(await prisma.cycle.count()).toBe(0);
  });

  it("lets an edit keep its own dates without counting as an overlap", async () => {
    const { token } = await createUser();
    const { cycle } = await json<CycleBody>(
      await addCycle(token, { startDate: "2026-10-01", endDate: "2026-10-05" }),
    );
    const res = await PUT(
      makeRequest(`/api/cycles/${cycle.id}`, {
        method: "PUT",
        token,
        body: { startDate: "2026-10-02", endDate: "2026-10-05" },
      }),
      params({ id: cycle.id }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 404 when touching another user's period", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const { cycle } = await json<CycleBody>(await addCycle(owner.token, { startDate: "2026-10-01" }));

    const put = await PUT(
      makeRequest(`/api/cycles/${cycle.id}`, {
        method: "PUT",
        token: intruder.token,
        body: { startDate: "2026-09-01", endDate: "2026-09-03" },
      }),
      params({ id: cycle.id }),
    );
    const del = await DELETE(
      makeRequest(`/api/cycles/${cycle.id}`, { method: "DELETE", token: intruder.token }),
      params({ id: cycle.id }),
    );
    expect(put.status).toBe(404);
    expect(del.status).toBe(404);
    expect(await prisma.cycle.count()).toBe(1);
  });
});
