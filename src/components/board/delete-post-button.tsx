"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "../ui";

export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setPending(true);
    const result = await api(`/api/posts/${postId}`, { method: "DELETE" });
    if (!result.ok) {
      setPending(false);
      window.alert(result.error);
      return;
    }
    router.push("/board");
    router.refresh();
  }

  return (
    <Button variant="danger" onClick={onDelete} disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
