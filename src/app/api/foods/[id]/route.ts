import { requireApiUser, route } from "@/server/http";
import { deleteFood } from "@/server/services/foods";

export const DELETE = route<RouteContext<"/api/foods/[id]">>(async (req, ctx) => {
  const user = await requireApiUser(req);
  const { id } = await ctx.params;
  await deleteFood(user.id, id);
  return new Response(null, { status: 204 });
});
