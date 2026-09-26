import { findProduct, isGarmentSize } from "@/lib/products";
import {
  MAX_IMAGE_BYTES,
  TryOnError,
  detectMimeType,
  generateVirtualTryOn,
  loadProductImage,
} from "@/lib/virtualTryOn";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * POST /api/virtual-try-on  (multipart/form-data)
 *   userImage: File    — JPEG, PNG or WEBP, up to 8 MB
 *   productId: string  — id from lib/products.ts
 *   size?: string      — clothing only: S, M, L or XL; omit to show the size that fits
 *
 * The photo is screened for nudity before anything is generated, and the result is screened again.
 *
 * 200 → { image: "data:image/png;base64,...", productId, size, estimatedSize }
 * 4xx/5xx → { error: { code, message } }   (message is safe to display)
 *
 * Nothing is written to disk; images live only in memory for the request.
 */
export async function POST(req: Request) {
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new TryOnError("BAD_REQUEST", "The request wasn't sent in the expected format.", 400);
    }

    const userFile = form.get("userImage");
    const productId = form.get("productId");
    const size = form.get("size");

    if (!(userFile instanceof File) || userFile.size === 0) {
      throw new TryOnError("MISSING_USER_IMAGE", "Add a photo of yourself first.", 400);
    }
    if (typeof productId !== "string" || productId.length === 0) {
      throw new TryOnError("MISSING_PRODUCT", "Choose an outfit first.", 400);
    }
    if (size !== null && size !== "" && !isGarmentSize(size)) {
      throw new TryOnError("BAD_REQUEST", "Choose a size from S, M, L or XL.", 400);
    }
    if (userFile.size > MAX_IMAGE_BYTES) {
      throw new TryOnError("IMAGE_TOO_LARGE", "Your photo is too large. Use one under 8 MB.", 413);
    }

    const product = findProduct(productId);
    if (!product) {
      throw new TryOnError("PRODUCT_NOT_FOUND", "That outfit is no longer available.", 404);
    }

    const userData = Buffer.from(await userFile.arrayBuffer());
    const userMime = detectMimeType(userData);
    if (!userMime) {
      throw new TryOnError("INVALID_IMAGE_FORMAT", "Use a JPEG, PNG or WEBP photo.", 415);
    }

    const clothingImage = await loadProductImage(product);

    const result = await generateVirtualTryOn({
      userImage: { data: userData, mimeType: userMime },
      clothingImage,
      productName: product.name,
      category: product.category,
      ...(product.section === "clothing"
        ? { layer: product.layer, size: isGarmentSize(size) ? size : undefined }
        : { placement: product.placement }),
    });

    return Response.json({
      image: `data:${result.mimeType};base64,${result.data.toString("base64")}`,
      productId: product.id,
      size: product.section === "clothing" && isGarmentSize(size) ? size : null,
      estimatedSize: product.section === "clothing" ? result.estimatedSize : null,
    });
  } catch (err) {
    if (err instanceof TryOnError) {
      return Response.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    console.error("[virtual-try-on] unexpected error:", err);
    return Response.json(
      { error: { code: "INTERNAL", message: "Something went wrong on the server. Try again." } },
      { status: 500 },
    );
  }
}
