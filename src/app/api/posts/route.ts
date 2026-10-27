import { postQuerySchema } from "@/lib/validation";
import { parseInput, requireApiUser, route, searchParamsObject } from "@/server/http";
import { readPostForm } from "@/server/post-form";
import { createPost, listPosts } from "@/server/services/posts";

/** GET /api/posts?q=lentil&tag=VEGAN&sort=popular&saved=1 */
export const GET = route(async (req) => {
  const user = await requireApiUser(req);
  const query = parseInput(postQuerySchema, searchParamsObject(req));
  return Response.json({ posts: await listPosts(user.id, query) });
});

/** Multipart form: title, description, ingredients, instructions?, tags[], image? */
export const POST = route(async (req) => {
  const user = await requireApiUser(req);
  const { input, image } = await readPostForm(req);
  return Response.json({ post: await createPost(user.id, input, image) }, { status: 201 });
});
