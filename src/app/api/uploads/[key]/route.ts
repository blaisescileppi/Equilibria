import { HttpError, requireApiUser, route } from "@/server/http";
import { readImage } from "@/server/storage";

/** Serves an uploaded meal photo to signed-in users. */
export const GET = route<RouteContext<"/api/uploads/[key]">>(async (req, ctx) => {
  await requireApiUser(req);
  const image = await readImage((await ctx.params).key);
  if (!image) throw new HttpError(404, "Image not found.");

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      // Keys are random and never reused, so the browser can cache forever.
      "Cache-Control": "private, max-age=31536000, immutable",
      // Stops the browser from guessing a different (scriptable) type.
      "X-Content-Type-Options": "nosniff",
    },
  });
});
