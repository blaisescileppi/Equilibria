"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { cn } from "../ui";

// Optimistic UI: the button flips immediately, and rolls back if the
// server says no. Feels instant without lying about the final state.
export function PostActions({
  postId,
  initialLiked,
  initialSaved,
  initialLikeCount,
}: {
  postId: string;
  initialLiked: boolean;
  initialSaved: boolean;
  initialLikeCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const result = await api<{ likeCount: number }>(`/api/posts/${postId}/like`, {
      method: next ? "PUT" : "DELETE",
    });
    if (result.ok) {
      setLikeCount(result.data.likeCount); // the server's count is the truth
    } else {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
    setBusy(false);
  }

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    const result = await api(`/api/posts/${postId}/favorite`, { method: next ? "PUT" : "DELETE" });
    if (!result.ok) setSaved(!next);
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={toggleLike}
        aria-pressed={liked}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
          liked ? "border-period bg-period-soft text-brand-ink" : "border-stone-300 hover:bg-stone-50",
        )}
      >
        <span aria-hidden>{liked ? "♥" : "♡"}</span>
        {liked ? "Liked" : "Like"} · {likeCount}
      </button>
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={saved}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
          saved ? "border-sage bg-sage-soft text-stone-800" : "border-stone-300 hover:bg-stone-50",
        )}
      >
        <span aria-hidden>{saved ? "★" : "☆"}</span>
        {saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
