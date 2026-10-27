"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { MealTag } from "@/generated/prisma/enums";
import { api } from "@/lib/api-client";
import { MAX_IMAGE_BYTES } from "@/lib/images";
import { MEAL_TAG_LABELS } from "@/lib/labels";
import { fieldErrors, postSchema } from "@/lib/validation";
import { Alert, Button, Card, cn, Field } from "../ui";
import { PostImage } from "./post-image";

type Initial = {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string | null;
  tags: MealTag[];
  imageUrl: string | null;
};

export function PostForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [tags, setTags] = useState<MealTag[]>(initial?.tags ?? []);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Free the temporary preview URL when it's replaced or the form unmounts.
  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onFileChange(selected: File | null) {
    setErrors((e) => ({ ...e, image: "" }));
    if (selected && selected.size > MAX_IMAGE_BYTES) {
      setErrors((e) => ({ ...e, image: "Images must be 2 MB or smaller." }));
      return;
    }
    setFile(selected);
    setRemoveImage(false);
    setPreview(selected ? URL.createObjectURL(selected) : (initial?.imageUrl ?? null));
  }

  function toggleTag(tag: MealTag) {
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      ingredients: String(data.get("ingredients") ?? ""),
      instructions: String(data.get("instructions") ?? ""),
      tags,
    };
    const parsed = postSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));

    // Multipart, because it may carry a file. The server re-validates every field.
    const body = new FormData();
    body.set("title", values.title);
    body.set("description", values.description);
    body.set("ingredients", values.ingredients);
    body.set("instructions", values.instructions);
    for (const tag of tags) body.append("tags", tag);
    if (file) body.set("image", file);
    if (removeImage) body.set("removeImage", "1");

    setPending(true);
    const result = initial
      ? await api<{ post: { id: string } }>(`/api/posts/${initial.id}`, { method: "PUT", body })
      : await api<{ post: { id: string } }>("/api/posts", { method: "POST", body });
    if (!result.ok) {
      setPending(false);
      setErrors(result.fields);
      setFormError(result.error);
      return;
    }
    router.push(`/board/${result.data.post.id}`);
    router.refresh();
  }

  return (
    <Card className="max-w-3xl">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert>{formError}</Alert>}

        <Field label="Title" name="title" error={errors.title}>
          {(props) => <input {...props} maxLength={100} defaultValue={initial?.title} placeholder="e.g. Red lentil dal" />}
        </Field>
        <Field label="Why you like it" name="description" error={errors.description}>
          {(props) => <textarea {...props} rows={3} maxLength={1000} defaultValue={initial?.description} />}
        </Field>
        <Field label="Ingredients" name="ingredients" error={errors.ingredients} hint="One per line.">
          {(props) => (
            <textarea {...props} rows={6} maxLength={3000} defaultValue={initial?.ingredients.join("\n")} />
          )}
        </Field>
        <Field label="Instructions" name="instructions" error={errors.instructions} hint="Optional.">
          {(props) => <textarea {...props} rows={5} maxLength={5000} defaultValue={initial?.instructions ?? ""} />}
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-stone-800">Tags (up to 5)</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MEAL_TAG_LABELS) as MealTag[]).map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={tags.includes(tag)}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm",
                  tags.includes(tag) ? "border-brand bg-brand text-white" : "border-stone-300 hover:bg-stone-50",
                )}
              >
                {MEAL_TAG_LABELS[tag]}
              </button>
            ))}
          </div>
          {errors.tags && <p className="mt-1 text-xs text-red-700">{errors.tags}</p>}
        </fieldset>

        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-800">Photo (optional)</p>
          {preview && !removeImage && (
            <PostImage src={preview} title="Selected photo" className="aspect-[4/3] max-w-sm rounded-xl" />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Photo"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2"
            />
            {initial?.imageUrl && !file && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
                Remove current photo
              </label>
            )}
          </div>
          <p className="text-xs text-stone-500">JPEG, PNG, or WebP, up to 2 MB.</p>
          {errors.image && <p className="text-xs text-red-700">{errors.image}</p>}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : initial ? "Save changes" : "Share meal"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
