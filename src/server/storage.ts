import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { contentTypeForKey, detectImageType, MAX_IMAGE_BYTES } from "@/lib/images";
import { HttpError } from "./http";

// Image storage on the local disk. Everything else in the app only calls
// these three functions, so moving to cloud storage (e.g. S3 or Vercel Blob)
// for a deployment means rewriting this file and nothing else.

function uploadDir() {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

/** Validates and stores an image, returning its storage key. */
export async function saveImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new HttpError(400, "Please fix the highlighted fields.", { image: "Images must be 2 MB or smaller." });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) {
    throw new HttpError(400, "Please fix the highlighted fields.", { image: "Upload a JPEG, PNG, or WebP image." });
  }
  const key = `${randomUUID()}.${type.ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), key), bytes);
  return key;
}

export async function readImage(key: string) {
  const contentType = contentTypeForKey(key);
  if (!contentType) return null; // also blocks path traversal
  try {
    return { bytes: await readFile(path.join(uploadDir(), key)), contentType };
  } catch {
    return null;
  }
}

export async function deleteImage(key: string | null | undefined) {
  if (!key || !contentTypeForKey(key)) return;
  await rm(path.join(uploadDir(), key), { force: true });
}
