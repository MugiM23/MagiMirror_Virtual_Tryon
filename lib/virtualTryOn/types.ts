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
}

export interface TryOnResult {
  data: Buffer;
  mimeType: string;
}

/**
 * Anything that can turn (person photo + garment photo) into a try-on image.
 * Add a new provider by implementing this and registering it in index.ts.
 */
export interface TryOnProvider {
  name: string;
  generate(input: TryOnInput, signal: AbortSignal): Promise<TryOnResult>;
}
