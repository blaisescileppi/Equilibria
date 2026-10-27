import { requireApiUser, route } from "@/server/http";
import { setSaved } from "@/server/services/posts";

type Ctx = RouteContext<"/api/posts/[id]/favorite">;

// PUT = save to favorites, DELETE = remove. Both are safe to repeat.

export const PUT = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  return Response.json(await setSaved(user.id, (await ctx.params).id, true));
});

export const DELETE = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  return Response.json(await setSaved(user.id, (await ctx.params).id, false));
});
