import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeletePostButton } from "@/components/board/delete-post-button";
import { PostActions } from "@/components/board/post-actions";
import { PostImage } from "@/components/board/post-image";
import { Badge, ButtonLink, Card, LoadingBlock } from "@/components/ui";
import { MEAL_TAG_LABELS } from "@/lib/labels";
import { requireUser } from "@/server/auth/current-user";
import { HttpError } from "@/server/http";
import { getPost } from "@/server/services/posts";

export const metadata: Metadata = { title: "Meal idea" };

export default function PostPage({ params }: PageProps<"/board/[id]">) {
  return (
    <div className="space-y-4">
      <Link href="/board" className="text-sm text-stone-600 hover:text-brand">
        ← All meal ideas
      </Link>
      <Suspense fallback={<LoadingBlock />}>
        <PostContent params={params} />
      </Suspense>
    </div>
  );
}

async function PostContent({ params }: Pick<PageProps<"/board/[id]">, "params">) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const post = await getPost(user.id, id).catch((error) => {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  });

  return (
    <article className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card className="overflow-hidden p-0">
        <PostImage src={post.imageUrl} title={post.title} className="aspect-[16/9]" />
        <div className="space-y-5 p-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
            <p className="text-sm text-stone-500">
              Shared by {post.isMine ? "you" : post.author.displayName} on{" "}
              {new Date(post.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
            </p>
            <div className="flex flex-wrap gap-1">
              {post.tags.map((tag) => (
                <Badge key={tag}>{MEAL_TAG_LABELS[tag]}</Badge>
              ))}
            </div>
          </header>
          <p className="text-stone-700">{post.description}</p>
          <section>
            <h2 className="mb-2 font-semibold">Ingredients</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
              {post.ingredients.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
          {post.instructions && (
            <section>
              <h2 className="mb-2 font-semibold">Instructions</h2>
              <p className="whitespace-pre-line text-sm text-stone-700">{post.instructions}</p>
            </section>
          )}
        </div>
      </Card>

      <Card className="h-fit space-y-4">
        <PostActions
          postId={post.id}
          initialLiked={post.likedByMe}
          initialSaved={post.savedByMe}
          initialLikeCount={post.likeCount}
        />
        {post.isMine && (
          <div className="flex gap-2 border-t border-stone-100 pt-4">
            <ButtonLink href={`/board/${post.id}/edit`} variant="secondary">
              Edit
            </ButtonLink>
            <DeletePostButton postId={post.id} />
          </div>
        )}
      </Card>
    </article>
  );
}
