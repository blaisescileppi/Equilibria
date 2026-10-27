import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostForm } from "@/components/board/post-form";
import { LoadingBlock, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/current-user";
import { HttpError } from "@/server/http";
import { getPost } from "@/server/services/posts";

export const metadata: Metadata = { title: "Edit meal" };

export default function EditPostPage({ params }: PageProps<"/board/[id]/edit">) {
  return (
    <>
      <PageHeader title="Edit meal" />
      <Suspense fallback={<LoadingBlock />}>
        <EditContent params={params} />
      </Suspense>
    </>
  );
}

async function EditContent({ params }: Pick<PageProps<"/board/[id]/edit">, "params">) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const post = await getPost(user.id, id).catch((error) => {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  });
  // Hide the form from non-authors; the API enforces this too (403).
  if (!post.isMine) notFound();
  return <PostForm initial={post} />;
}
