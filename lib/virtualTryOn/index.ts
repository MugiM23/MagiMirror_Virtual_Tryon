import { CATEGORIES, type JewelleryPlacement } from "@/lib/products";
import { TryOnError } from "./errors";
import { geminiProvider } from "./providers/gemini";
import type { BodyPart, PhotoCheck, TryOnInput, TryOnProvider, TryOnResult } from "./types";

export { TryOnError } from "./errors";
export { MAX_IMAGE_BYTES, detectMimeType } from "./image";
export { loadProductImage } from "./productImages";
export type * from "./types";

const providers: Record<string, TryOnProvider> = {
  gemini: geminiProvider,
};

// Photo check + generation (~30 s on gemini-3.1-flash-image) + result check.
const DEFAULT_TIMEOUT_MS = 80_000;

const NEEDED_PART: Record<JewelleryPlacement, { part: BodyPart; message: string }> = {
  neck: { part: "neck", message: "We can't see your neck in the photo. Retake it with your neck and shoulders in view." },
  ears: { part: "ears", message: "We can't see your ears in the photo. Tuck your hair behind your ears and retake it." },
  wrist: { part: "wrists", message: "We can't see your wrists in the photo. Retake it with your hands in view." },
  finger: { part: "hands", message: "We can't see your hands in the photo. Retake it with a hand held up in view." },
};

function rejectPhoto(check: PhotoCheck): TryOnError {
  if (check.issue === "no_person") {
    return new TryOnError(
      "NO_PERSON",
      "We couldn't see you clearly in the photo. Stand in front of the mirror and retake it.",
      422,
    );
  }
  // Log the category only; never the image.
  console.warn(`[virtual-try-on] photo rejected: ${check.issue}`);
  return new TryOnError(
    "UNSAFE_PHOTO",
    "This photo can't be used. Please make sure you're fully dressed, then retake the photo.",
    422,
  );
}

/**
 * 1. Screen the customer's photo (nudity, no person) and estimate their size.
 *    Nothing reaches the image model unless this passes.
 * 2. Generate the try-on.
 * 3. Screen the result the same way before it's returned.
 */
async function runTryOn(provider: TryOnProvider, input: TryOnInput, signal: AbortSignal): Promise<TryOnResult> {
  const check = await provider.checkPhoto(input.userImage, signal);
  if (!check.allowed) throw rejectPhoto(check);
  // Men's photo, women's outfit (or the other way round): stop before paying for a generation.
  if (input.category && check.collection && check.collection !== input.category) {
    const label = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
    throw new TryOnError(
      "WRONG_COLLECTION",
      `This item is from the ${label(input.category)}'s collection. Please choose one from the ${label(check.collection)}'s collection.`,
      422,
    );
  }

  // Jewellery needs the right part of the body in the photo, or the model has nowhere to put it.
  if (input.placement) {
    const needed = NEEDED_PART[input.placement];
    if (!check.visibleParts.includes(needed.part)) {
      throw new TryOnError("PART_NOT_VISIBLE", needed.message, 422);
    }
  }

  const result = await provider.generate(
    { ...input, personSize: check.estimatedSize, currentClothing: check.clothing },
    signal,
  );

  const resultCheck = await provider.checkPhoto(result, signal);
  if (!resultCheck.allowed && resultCheck.issue !== "no_person") {
    console.warn(`[virtual-try-on] result rejected: ${resultCheck.issue}`);
    throw new TryOnError("UNSAFE_RESULT", "This preview couldn't be shown. Try a different outfit.", 422);
  }

  return { ...result, estimatedSize: check.estimatedSize };
}

/**
 * Provider-agnostic entry point. The API route calls this; nothing in the UI
 * knows which AI provider is behind it.
 */
export async function generateVirtualTryOn(
  input: TryOnInput,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<TryOnResult> {
  const providerName = process.env.TRYON_PROVIDER || "gemini";
  const provider = providers[providerName];
  if (!provider) {
    console.error(`[virtual-try-on] unknown TRYON_PROVIDER "${providerName}"`);
    throw new TryOnError("CONFIG_ERROR", "The try-on service isn't configured correctly.", 500);
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Race against a timer as well as passing the signal, in case a provider
  // SDK doesn't honour abort promptly.
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TryOnError("TIMEOUT", "The try-on took too long to finish. Try again.", 504));
    }, timeoutMs);
  });

  try {
    return await Promise.race([runTryOn(provider, input, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
