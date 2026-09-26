// Browser-side helpers. No secrets here: this only talks to our own API route.

import { isGarmentSize, type GarmentSize } from "@/lib/products";

const MAX_SIDE = 1536; // plenty for the model, keeps uploads small
const CLIENT_TIMEOUT_MS = 100_000;

export type TryOnClientErrorCode =
  | "CANCELLED"
  | "TIMEOUT"
  | "NETWORK"
  | "INVALID_RESPONSE"
  | string; // server codes

export class TryOnRequestError extends Error {
  constructor(message: string, public readonly code: TryOnClientErrorCode) {
    super(message);
    this.name = "TryOnRequestError";
  }
}

/**
 * Downscale large photos and re-encode as JPEG before upload.
 * Falls back to the original file if the browser can't decode it.
 */
export async function prepareImage(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 4 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.9),
    );
  } catch {
    return file;
  }
}

interface SuccessBody {
  image: string;
  estimatedSize?: unknown;
}

export interface TryOnResponse {
  /** data: URL of the generated image */
  image: string;
  /** The person's usual size as estimated from their photo, if it could be judged */
  estimatedSize: GarmentSize | null;
}

/** Codes meaning the photo itself can't be used, so the user has to take a new one. */
export const RETAKE_CODES = new Set(["UNSAFE_PHOTO", "NO_PERSON"]);
interface ErrorBody {
  error: { code: string; message: string };
}

function isSuccessBody(body: unknown): body is SuccessBody {
  return typeof body === "object" && body !== null && typeof (body as SuccessBody).image === "string";
}
function isErrorBody(body: unknown): body is ErrorBody {
  const e = (body as ErrorBody | null)?.error;
  return typeof e?.message === "string" && typeof e?.code === "string";
}

function extensionFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

/** Calls POST /api/virtual-try-on. */
export async function requestTryOn({
  userImage,
  productId,
  size,
  signal,
}: {
  userImage: Blob;
  productId: string;
  size?: GarmentSize | null;
  signal?: AbortSignal;
}): Promise<TryOnResponse> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CLIENT_TIMEOUT_MS);
  const onCancel = () => controller.abort();
  signal?.addEventListener("abort", onCancel);

  const form = new FormData();
  form.append("userImage", userImage, `user.${extensionFor(userImage.type)}`);
  form.append("productId", productId);
  if (size) form.append("size", size);

  try {
    let res: Response;
    let body: unknown;
    try {
      res = await fetch("/api/virtual-try-on", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      body = await res.json().catch(() => null);
    } catch {
      if (timedOut) {
        throw new TryOnRequestError("The try-on took too long to finish. Try again.", "TIMEOUT");
      }
      if (signal?.aborted) throw new TryOnRequestError("Cancelled.", "CANCELLED");
      throw new TryOnRequestError(
        "Couldn't reach the server. Check that the app is running and try again.",
        "NETWORK",
      );
    }

    if (!res.ok) {
      if (isErrorBody(body)) throw new TryOnRequestError(body.error.message, body.error.code);
      throw new TryOnRequestError("The server couldn't complete the try-on. Try again.", `HTTP_${res.status}`);
    }
    if (!isSuccessBody(body) || !body.image.startsWith("data:image/")) {
      throw new TryOnRequestError("The result image was missing. Try again.", "INVALID_RESPONSE");
    }
    return {
      image: body.image,
      estimatedSize: isGarmentSize(body.estimatedSize) ? body.estimatedSize : null,
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onCancel);
  }
}
