import { requireApiUser, route } from "@/server/http";
import { setLiked } from "@/server/services/posts";

type Ctx = RouteContext<"/api/posts/[id]/like">;

// PUT = like, DELETE = unlike. Both are safe to repeat.

export const PUT = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  return Response.json(await setLiked(user.id, (await ctx.params).id, true));
});

export const DELETE = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  return Response.json(await setLiked(user.id, (await ctx.params).id, false));
});
