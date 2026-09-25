import type { SupportedMimeType } from "./types";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Detect the real format from the file's first bytes rather than trusting
 * the filename or the Content-Type the browser sent.
 */
export function detectMimeType(buf: Buffer): SupportedMimeType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length >= 8 && PNG.every((byte, i) => buf[i] === byte)) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
