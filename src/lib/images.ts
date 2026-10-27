// Identify an uploaded image by its first bytes ("magic numbers") instead
// of trusting the file name or the Content-Type the browser sent, both of
// which an uploader controls.

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

export type ImageType = { ext: "jpg" | "png" | "webp"; contentType: string };

export function detectImageType(bytes: Uint8Array): ImageType | null {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);

  if (starts([0xff, 0xd8, 0xff])) return { ext: "jpg", contentType: "image/jpeg" };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ext: "png", contentType: "image/png" };
  }
  // RIFF....WEBP
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) {
    return { ext: "webp", contentType: "image/webp" };
  }
  return null;
}

/** Stored names are always <uuid>.<ext>; anything else (like "../.env") is refused. */
export const IMAGE_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export function contentTypeForKey(key: string): string | null {
  if (!IMAGE_KEY_PATTERN.test(key)) return null;
  const ext = key.split(".").pop();
  return ext === "jpg" ? "image/jpeg" : ext === "png" ? "image/png" : "image/webp";
}
