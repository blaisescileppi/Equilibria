import { requireApiUser, route } from "@/server/http";
import { readPostForm } from "@/server/post-form";
import { deletePost, getPost, updatePost } from "@/server/services/posts";

type Ctx = RouteContext<"/api/posts/[id]">;

export const GET = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  const { id } = await ctx.params;
  return Response.json({ post: await getPost(user.id, id) });
});

/** Same multipart fields as POST, plus removeImage=1 to drop the current photo. */
export const PUT = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  const { id } = await ctx.params;
  const { input, image, removeImage } = await readPostForm(req);
  return Response.json({ post: await updatePost(user.id, id, input, { image, removeImage }) });
});

export const DELETE = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  const { id } = await ctx.params;
  await deletePost(user.id, id);
  return new Response(null, { status: 204 });
});
