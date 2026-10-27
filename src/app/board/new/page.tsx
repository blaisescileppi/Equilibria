import type { Metadata } from "next";
import { PostForm } from "@/components/board/post-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Share a meal" };

export default function NewPostPage() {
  return (
    <>
      <PageHeader title="Share a meal" description="Post a meal you'd recommend. Everyone signed in to Equilibria can see it." />
      <PostForm />
    </>
  );
}
