import { TryOnError } from "./errors";
import { geminiProvider } from "./providers/gemini";
import type { TryOnInput, TryOnProvider, TryOnResult } from "./types";

export { TryOnError } from "./errors";
export { MAX_IMAGE_BYTES, detectMimeType } from "./image";
export { loadProductImage } from "./productImages";
export type * from "./types";

const providers: Record<string, TryOnProvider> = {
  gemini: geminiProvider,
};

const DEFAULT_TIMEOUT_MS = 60_000;

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
    return await Promise.race([provider.generate(input, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
