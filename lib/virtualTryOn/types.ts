import type { GarmentLayer, GarmentSize, JewelleryPlacement, ProductCategory } from "@/lib/products";

export type SupportedMimeType = "image/jpeg" | "image/png" | "image/webp";

export interface TryOnImage {
  data: Buffer;
  mimeType: SupportedMimeType;
}

export interface TryOnInput {
  userImage: TryOnImage;
  clothingImage: TryOnImage;
  /** Optional hint for the prompt, e.g. "Indigo wrap dress" */
  productName?: string;
  /** Collection the item belongs to; the photo must match it */
  category?: ProductCategory;
  /** Clothing: what the item replaces on the person; defaults to a full outfit */
  layer?: GarmentLayer;
  /** Jewellery: where it's worn. When set, the jewellery prompt is used instead of the clothing one */
  placement?: JewelleryPlacement;
  /** Size the customer wants to see; omitted means "the size that fits them" */
  size?: GarmentSize;
}

/** What the provider gets once the photo has passed the safety check. */
export interface GenerateInput extends TryOnInput {
  /** The person's usual size, estimated from their photo, if it could be judged */
  personSize: GarmentSize | null;
  /** What they're wearing now, e.g. "brown half-sleeve T-shirt, blue jeans", so the prompt can name what to remove */
  currentClothing: string | null;
}

/** Body parts the photo check reports as visible, for placing jewellery. */
export type BodyPart = "neck" | "ears" | "wrists" | "hands";

export type PhotoIssue = "none" | "nudity" | "underwear" | "sexual" | "no_person";

export interface PhotoCheck {
  /** False when the photo must not be used or shown */
  allowed: boolean;
  issue: PhotoIssue;
  estimatedSize: GarmentSize | null;
  /** Collection that suits the person (men/women), or null if it couldn't be judged */
  collection: ProductCategory | null;
  /** Body parts visible enough to put jewellery on */
  visibleParts: BodyPart[];
  /** Garments the person is wearing, or null if not described */
  clothing: string | null;
}

export interface TryOnResult {
  data: Buffer;
  mimeType: string;
  /** The person's usual size as estimated from their photo, if it could be judged */
  estimatedSize: GarmentSize | null;
}

/**
 * Anything that can turn (person photo + garment photo) into a try-on image.
 * Add a new provider by implementing this and registering it in index.ts.
 */
export interface TryOnProvider {
  name: string;
  /** Screens a photo for nudity and estimates the person's size. Must throw rather than guess if it can't tell. */
  checkPhoto(image: { data: Buffer; mimeType: string }, signal: AbortSignal): Promise<PhotoCheck>;
  generate(input: GenerateInput, signal: AbortSignal): Promise<Omit<TryOnResult, "estimatedSize">>;
}
