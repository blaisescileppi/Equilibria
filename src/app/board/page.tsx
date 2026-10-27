import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { MealTag } from "@/generated/prisma/enums";
import { PostActions } from "@/components/board/post-actions";
import { PostImage } from "@/components/board/post-image";
import { Badge, Button, ButtonLink, EmptyState, LoadingBlock, PageHeader } from "@/components/ui";
import { MEAL_TAG_LABELS } from "@/lib/labels";
import { postQuerySchema } from "@/lib/validation";
import { requireUser } from "@/server/auth/current-user";
import { listPosts } from "@/server/services/posts";

export const metadata: Metadata = { title: "Meal ideas" };

export default function BoardPage({ searchParams }: PageProps<"/board">) {
  return (
    <>
      <PageHeader
        title="Meal ideas"
        description="Meals other people recommend. Like the ones you enjoy, save the ones you want to try, and share your own."
        actions={<ButtonLink href="/board/new">Share a meal</ButtonLink>}
      />
      <Suspense fallback={<LoadingBlock />}>
        <BoardContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function BoardContent({ searchParams }: Pick<PageProps<"/board">, "searchParams">) {
  const [user, raw] = await Promise.all([requireUser(), searchParams]);
  // Invalid filters (e.g. a hand-edited ?tag=) fall back to the defaults.
  const parsed = postQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : postQuerySchema.parse({});
  const posts = await listPosts(user.id, query);

  return (
    <div className="space-y-6">
      {/* A plain GET form: filters work without JavaScript and every view has a shareable URL. */}
      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <label className="min-w-48 flex-1">
          <span className="mb-1 block text-xs font-medium text-stone-600">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Ingredient or dish"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-stone-600">Tag</span>
          <select name="tag" defaultValue={query.tag ?? ""} className="rounded-lg border border-stone-300 px-2 py-2 text-sm">
            <option value="">Any</option>
            {(Object.keys(MEAL_TAG_LABELS) as MealTag[]).map((tag) => (
              <option key={tag} value={tag}>
                {MEAL_TAG_LABELS[tag]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-stone-600">Sort</span>
          <select name="sort" defaultValue={query.sort} className="rounded-lg border border-stone-300 px-2 py-2 text-sm">
            <option value="new">Newest</option>
            <option value="popular">Most liked</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="saved" value="1" defaultChecked={query.saved} className="size-4 accent-brand" />
          Saved only
        </label>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      {posts.length === 0 ? (
        <EmptyState title={query.saved ? "You haven't saved any meals yet" : "No meals match those filters"}>
          <Link href="/board" className="text-brand underline">
            Clear filters
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <Link href={`/board/${post.id}`} className="block">
                <PostImage src={post.imageUrl} title={post.title} className="aspect-[4/3]" />
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <Link href={`/board/${post.id}`} className="font-semibold hover:text-brand">
                    {post.title}
                  </Link>
                  <p className="text-xs text-stone-500">by {post.isMine ? "you" : post.author.displayName}</p>
                </div>
                <p className="line-clamp-2 text-sm text-stone-600">{post.description}</p>
                <div className="flex flex-wrap gap-1">
                  {post.tags.map((tag) => (
                    <Badge key={tag}>{MEAL_TAG_LABELS[tag]}</Badge>
                  ))}
                </div>
                <div className="mt-auto">
                  <PostActions
                    postId={post.id}
                    initialLiked={post.likedByMe}
                    initialSaved={post.savedByMe}
                    initialLikeCount={post.likeCount}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
