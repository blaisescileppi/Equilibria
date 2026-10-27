import "server-only";
import type { NextRequest } from "next/server";
import { MAX_IMAGE_BYTES } from "@/lib/images";
import { postSchema } from "@/lib/validation";
import { HttpError, parseInput } from "./http";

/**
 * Reads a multipart meal-post submission: text fields go through the zod
 * schema, and the optional image is returned separately for the storage layer.
 */
export async function readPostForm(req: NextRequest) {
  // Refuse obviously oversized uploads before reading the body into memory.
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_IMAGE_BYTES + 64 * 1024) {
    throw new HttpError(413, "That upload is too large. Images must be 2 MB or smaller.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, "Expected a multipart form submission.");
  }

  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : undefined;
  };

  const input = parseInput(postSchema, {
    title: text("title"),
    description: text("description"),
    ingredients: text("ingredients"),
    instructions: text("instructions"),
    tags: form.getAll("tags").filter((t) => typeof t === "string"),
  });

  const file = form.get("image");
  const image = file instanceof File && file.size > 0 ? file : null;
  return { input, image, removeImage: text("removeImage") === "1" };
}
