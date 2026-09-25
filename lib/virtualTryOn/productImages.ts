import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Product } from "@/lib/products";
import { TryOnError } from "./errors";
import { detectMimeType } from "./image";
import type { TryOnImage } from "./types";

/**
 * Phase 1: product images live in /public. When the catalogue moves to a CDN
 * or CMS, swap this function for one that fetches from an allow-listed host.
 */
export async function loadProductImage(product: Product): Promise<TryOnImage> {
  const publicDir = path.join(process.cwd(), "public");
  const filePath = path.resolve(publicDir, "." + product.imageUrl);

  if (!filePath.startsWith(publicDir + path.sep)) {
    throw new TryOnError("PRODUCT_IMAGE_UNAVAILABLE", "This product's image isn't available.", 500);
  }

  let data: Buffer;
  try {
    data = await readFile(filePath);
  } catch {
    console.error(`[virtual-try-on] product image missing: ${product.imageUrl}`);
    throw new TryOnError("PRODUCT_IMAGE_UNAVAILABLE", "This product's image isn't available.", 500);
  }

  const mimeType = detectMimeType(data);
  if (!mimeType) {
    throw new TryOnError(
      "PRODUCT_IMAGE_UNAVAILABLE",
      "This product's image is in an unsupported format.",
      500,
    );
  }
  return { data, mimeType };
}
