import "server-only";
import type { MealTag, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { PostInput, PostQuery } from "@/lib/validation";
import { HttpError, notFound } from "../http";
import { deleteImage, saveImage } from "../storage";

export type PostDTO = {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string | null;
  tags: MealTag[];
  imageUrl: string | null;
  createdAt: string;
  author: { id: string; displayName: string };
  likeCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  isMine: boolean;
};

// One include shape for every read, so list and detail stay consistent.
// The likes/favorites filters fetch at most one row: "did *this* user...?"
function includeFor(userId: string) {
  return {
    author: { select: { id: true, displayName: true } },
    _count: { select: { likes: true } },
    likes: { where: { userId }, select: { userId: true } },
    favorites: { where: { userId }, select: { userId: true } },
  } satisfies Prisma.MealPostInclude;
}

type PostRow = Prisma.MealPostGetPayload<{ include: ReturnType<typeof includeFor> }>;

function toDTO(row: PostRow, userId: string): PostDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    ingredients: row.ingredients.split("\n").map((s) => s.trim()).filter(Boolean),
    instructions: row.instructions,
    tags: row.tags,
    imageUrl: row.imageKey ? `/api/uploads/${row.imageKey}` : null,
    createdAt: row.createdAt.toISOString(),
    author: row.author,
    likeCount: row._count.likes,
    likedByMe: row.likes.length > 0,
    savedByMe: row.favorites.length > 0,
    isMine: row.authorId === userId,
  };
}

export async function listPosts(userId: string, query: PostQuery, take = 30): Promise<PostDTO[]> {
  const where: Prisma.MealPostWhereInput = {
    ...(query.tag && { tags: { has: query.tag } }),
    ...(query.saved && { favorites: { some: { userId } } }),
    ...(query.q && {
      OR: [
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        { ingredients: { contains: query.q, mode: "insensitive" } },
      ],
    }),
  };
  const rows = await prisma.mealPost.findMany({
    where,
    include: includeFor(userId),
    orderBy:
      query.sort === "popular"
        ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
        : { createdAt: "desc" },
    take,
  });
  return rows.map((row) => toDTO(row, userId));
}

export async function getPost(userId: string, id: string): Promise<PostDTO> {
  const row = await prisma.mealPost.findUnique({ where: { id }, include: includeFor(userId) });
  if (!row) throw notFound("Post not found.");
  return toDTO(row, userId);
}

export async function createPost(userId: string, input: PostInput, image: File | null) {
  const imageKey = image ? await saveImage(image) : null;
  try {
    const row = await prisma.mealPost.create({
      data: { ...input, authorId: userId, imageKey },
      include: includeFor(userId),
    });
    return toDTO(row, userId);
  } catch (error) {
    await deleteImage(imageKey); // don't leave an orphaned file behind
    throw error;
  }
}

async function requireAuthor(userId: string, id: string) {
  const post = await prisma.mealPost.findUnique({ where: { id } });
  if (!post) throw notFound("Post not found.");
  if (post.authorId !== userId) throw new HttpError(403, "You can only change your own posts.");
  return post;
}

export async function updatePost(
  userId: string,
  id: string,
  input: PostInput,
  options: { image: File | null; removeImage: boolean },
) {
  const existing = await requireAuthor(userId, id);
  const newKey = options.image ? await saveImage(options.image) : null;
  const imageKey = newKey ?? (options.removeImage ? null : existing.imageKey);

  try {
    const row = await prisma.mealPost.update({
      where: { id },
      data: { ...input, imageKey },
      include: includeFor(userId),
    });
    // Only remove the old file once the database points at the new state.
    if (existing.imageKey && existing.imageKey !== imageKey) await deleteImage(existing.imageKey);
    return toDTO(row, userId);
  } catch (error) {
    await deleteImage(newKey);
    throw error;
  }
}

export async function deletePost(userId: string, id: string) {
  const post = await requireAuthor(userId, id);
  await prisma.mealPost.delete({ where: { id } }); // likes and saves cascade
  await deleteImage(post.imageKey);
}

async function assertPostExists(id: string) {
  if (!(await prisma.mealPost.findUnique({ where: { id }, select: { id: true } }))) {
    throw notFound("Post not found.");
  }
}

// Like and save are idempotent: PUT twice still means "liked once", and the
// composite primary key guarantees it even under concurrent requests.

export async function setLiked(userId: string, postId: string, liked: boolean) {
  await assertPostExists(postId);
  if (liked) {
    await prisma.postLike.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    });
  } else {
    await prisma.postLike.deleteMany({ where: { userId, postId } });
  }
  return { liked, likeCount: await prisma.postLike.count({ where: { postId } }) };
}

export async function setSaved(userId: string, postId: string, saved: boolean) {
  await assertPostExists(postId);
  if (saved) {
    await prisma.postFavorite.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    });
  } else {
    await prisma.postFavorite.deleteMany({ where: { userId, postId } });
  }
  return { saved };
}
