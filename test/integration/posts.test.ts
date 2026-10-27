import { readdir } from "node:fs/promises";
import { beforeEach, describe, expect, it } from "vitest";
import { PUT as save } from "@/app/api/posts/[id]/favorite/route";
import { DELETE as unlike, PUT as like } from "@/app/api/posts/[id]/like/route";
import { DELETE as deletePost, GET as getPost, PUT as updatePost } from "@/app/api/posts/[id]/route";
import { GET as listPosts, POST as createPost } from "@/app/api/posts/route";
import { GET as getUpload } from "@/app/api/uploads/[key]/route";
import { prisma } from "@/lib/db";
import { createUser, json, makeRequest, params, resetDb } from "../helpers";

beforeEach(resetDb);

// Smallest valid PNG header; detection only looks at the first bytes.
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

type PostBody = {
  post: { id: string; imageUrl: string | null; likeCount: number; likedByMe: boolean; isMine: boolean; ingredients: string[] };
};

function postForm(overrides: Record<string, string | string[]> = {}, image?: Blob) {
  const fields: Record<string, string | string[]> = {
    title: "Lentil soup",
    description: "Warm, filling, and full of iron.",
    ingredients: "1 cup lentils\n2 carrots\n\n1 onion",
    tags: ["IRON_RICH", "VEGAN"],
    ...overrides,
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) form.append(key, v);
  }
  if (image) form.append("image", image, "photo.png");
  return form;
}

const uploadedFiles = () => readdir(process.env.UPLOAD_DIR!).catch(() => [] as string[]);

async function publish(token: string, form = postForm()) {
  return createPost(makeRequest("/api/posts", { method: "POST", token, body: form }), {});
}

describe("creating posts", () => {
  it("creates a post with an image and serves the image back", async () => {
    const { token } = await createUser();
    const res = await publish(token, postForm({}, new Blob([PNG], { type: "image/png" })));
    expect(res.status).toBe(201);
    const { post } = await json<PostBody>(res);
    expect(post.ingredients).toEqual(["1 cup lentils", "2 carrots", "1 onion"]);
    expect(post.imageUrl).toMatch(/^\/api\/uploads\/[0-9a-f-]+\.png$/);

    const key = post.imageUrl!.split("/").pop()!;
    const image = await getUpload(makeRequest(post.imageUrl!, { token }), params({ key }));
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");
    expect(image.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("rejects a non-image file disguised as a PNG", async () => {
    const { token } = await createUser();
    const filesBefore = await uploadedFiles();
    const fake = new Blob(["<script>alert(1)</script>"], { type: "image/png" });
    const res = await publish(token, postForm({}, fake));
    expect(res.status).toBe(400);
    expect((await json<{ fields: object }>(res)).fields).toHaveProperty("image");
    expect(await prisma.mealPost.count()).toBe(0);
    expect(await uploadedFiles()).toEqual(filesBefore); // nothing written to disk
  });

  it("rejects images over 2 MB", async () => {
    const { token } = await createUser();
    const big = new Uint8Array(2 * 1024 * 1024 + 1);
    big.set(PNG);
    const res = await publish(token, postForm({}, new Blob([big], { type: "image/png" })));
    expect([400, 413]).toContain(res.status);
  });

  it("validates text fields and tags", async () => {
    const { token } = await createUser();
    const res = await publish(token, postForm({ title: "", tags: ["NOT_A_TAG"] }));
    expect(res.status).toBe(400);
    const { fields } = await json<{ fields: Record<string, string> }>(res);
    expect(Object.keys(fields)).toEqual(expect.arrayContaining(["title", "tags.0"]));
  });

  it("refuses to serve files outside the upload folder", async () => {
    const { token } = await createUser();
    const res = await getUpload(makeRequest("/api/uploads/x", { token }), params({ key: "../../.env" }));
    expect(res.status).toBe(404);
  });
});

describe("browsing", () => {
  it("searches, filters by tag, sorts by likes, and lists saved posts", async () => {
    const author = await createUser();
    const fan = await createUser();
    const soup = (await json<PostBody>(await publish(author.token))).post;
    const bowl = (
      await json<PostBody>(
        await publish(
          author.token,
          postForm({ title: "Salmon bowl", description: "Protein-packed lunch idea.", ingredients: "salmon\nrice", tags: ["HIGH_PROTEIN"] }),
        ),
      )
    ).post;

    await like(makeRequest(`/api/posts/${bowl.id}/like`, { method: "PUT", token: fan.token }), params({ id: bowl.id }));
    await save(makeRequest(`/api/posts/${soup.id}/favorite`, { method: "PUT", token: fan.token }), params({ id: soup.id }));

    const titles = async (query: string) => {
      const res = await listPosts(makeRequest(`/api/posts${query}`, { token: fan.token }), {});
      return (await json<{ posts: { title: string }[] }>(res)).posts.map((p) => p.title);
    };

    expect(await titles("?q=LENTIL")).toEqual(["Lentil soup"]);
    expect(await titles("?q=rice")).toEqual(["Salmon bowl"]); // matches ingredients
    expect(await titles("?tag=VEGAN")).toEqual(["Lentil soup"]);
    expect(await titles("?sort=popular")).toEqual(["Salmon bowl", "Lentil soup"]);
    expect(await titles("?saved=1")).toEqual(["Lentil soup"]);
    expect((await listPosts(makeRequest("/api/posts?tag=SPICY", { token: fan.token }), {})).status).toBe(400);
  });
});

describe("likes", () => {
  it("are idempotent and counted once per user", async () => {
    const author = await createUser();
    const fan = await createUser();
    const { post } = await json<PostBody>(await publish(author.token));
    const req = () => makeRequest(`/api/posts/${post.id}/like`, { method: "PUT", token: fan.token });

    await like(req(), params({ id: post.id }));
    const second = await json<{ likeCount: number }>(await like(req(), params({ id: post.id })));
    expect(second.likeCount).toBe(1);

    const view = await json<PostBody>(
      await getPost(makeRequest(`/api/posts/${post.id}`, { token: fan.token }), params({ id: post.id })),
    );
    expect(view.post).toMatchObject({ likeCount: 1, likedByMe: true, isMine: false });

    const removed = await unlike(
      makeRequest(`/api/posts/${post.id}/like`, { method: "DELETE", token: fan.token }),
      params({ id: post.id }),
    );
    expect((await json<{ likeCount: number }>(removed)).likeCount).toBe(0);
  });

  it("404 for a post that doesn't exist", async () => {
    const { token } = await createUser();
    const res = await like(makeRequest("/api/posts/nope/like", { method: "PUT", token }), params({ id: "nope" }));
    expect(res.status).toBe(404);
  });
});

describe("editing and deleting", () => {
  it("lets only the author edit, replace the photo, and delete", async () => {
    const author = await createUser();
    const other = await createUser();
    const { post } = await json<PostBody>(
      await publish(author.token, postForm({}, new Blob([PNG], { type: "image/png" }))),
    );
    const firstKey = post.imageUrl!.split("/").pop()!;

    const forbidden = await updatePost(
      makeRequest(`/api/posts/${post.id}`, { method: "PUT", token: other.token, body: postForm({ title: "Hacked" }) }),
      params({ id: post.id }),
    );
    expect(forbidden.status).toBe(403);

    const replaced = await updatePost(
      makeRequest(`/api/posts/${post.id}`, {
        method: "PUT",
        token: author.token,
        body: postForm({ title: "Better lentil soup" }, new Blob([PNG], { type: "image/png" })),
      }),
      params({ id: post.id }),
    );
    expect(replaced.status).toBe(200);
    const updated = (await json<PostBody>(replaced)).post;
    expect(updated.imageUrl).not.toContain(firstKey);
    expect(await uploadedFiles()).not.toContain(firstKey); // old file cleaned up

    const removedPhoto = await updatePost(
      makeRequest(`/api/posts/${post.id}`, { method: "PUT", token: author.token, body: postForm({ removeImage: "1" }) }),
      params({ id: post.id }),
    );
    expect((await json<PostBody>(removedPhoto)).post.imageUrl).toBeNull();

    expect(
      (await deletePost(makeRequest(`/api/posts/${post.id}`, { method: "DELETE", token: other.token }), params({ id: post.id }))).status,
    ).toBe(403);
    expect(
      (await deletePost(makeRequest(`/api/posts/${post.id}`, { method: "DELETE", token: author.token }), params({ id: post.id }))).status,
    ).toBe(204);
    expect(await prisma.mealPost.count()).toBe(0);
  });
});
