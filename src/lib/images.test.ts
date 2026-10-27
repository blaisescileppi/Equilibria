import { describe, expect, it } from "vitest";
import { contentTypeForKey, detectImageType } from "./images";

const bytes = (...values: number[]) => new Uint8Array(values);

describe("detectImageType", () => {
  it("recognizes JPEG, PNG, and WebP signatures", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext).toBe("jpg");
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))?.ext).toBe("png");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(detectImageType(webp)?.ext).toBe("webp");
  });

  it("rejects other files even if they claim to be images", () => {
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(detectImageType(bytes(0x4d, 0x5a))).toBeNull(); // Windows executable
    expect(detectImageType(bytes())).toBeNull();
  });
});

describe("contentTypeForKey", () => {
  it("accepts only keys the server generated", () => {
    expect(contentTypeForKey("3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b.png")).toBe("image/png");
    expect(contentTypeForKey("../../.env")).toBeNull();
    expect(contentTypeForKey("3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b.svg")).toBeNull();
    expect(contentTypeForKey("photo.jpg")).toBeNull();
  });
});
