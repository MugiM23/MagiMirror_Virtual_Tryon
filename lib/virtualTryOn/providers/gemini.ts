import { ApiError, FinishReason, GoogleGenAI, Modality } from "@google/genai";
import { TryOnError } from "../errors";
import { buildTryOnPrompt } from "../prompt";
import type { TryOnInput, TryOnProvider, TryOnResult } from "../types";

// "Nano Banana". Override with GEMINI_IMAGE_MODEL, e.g. gemini-3-pro-image-preview.
const DEFAULT_MODEL = "gemini-2.5-flash-image";

const BLOCKED_FINISH_REASONS = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.IMAGE_SAFETY,
  FinishReason.IMAGE_PROHIBITED_CONTENT,
  FinishReason.BLOCKLIST,
]);

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[virtual-try-on] GEMINI_API_KEY is not set");
    throw new TryOnError("CONFIG_ERROR", "The try-on service isn't configured yet.", 500);
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

function toBase64(buf: Buffer): string {
  return buf.toString("base64");
}

function mapGeminiError(err: unknown, signal: AbortSignal): TryOnError {
  if (err instanceof TryOnError) return err;
  if (signal.aborted) {
    return new TryOnError("TIMEOUT", "The try-on took too long to finish. Try again.", 504);
  }

  // Log the real error server-side only.
  console.error("[virtual-try-on] Gemini request failed:", err);

  if (err instanceof ApiError) {
    if (err.status === 429) {
      // "limit: 0" means the project has no quota for this model at all
      // (e.g. image models on the free tier), so retrying can never succeed.
      if (/limit:\s*0\b/.test(err.message)) {
        console.error(
          "[virtual-try-on] Gemini quota is 0 for this model. Enable billing on the API key's project in Google AI Studio.",
        );
        return new TryOnError(
          "CONFIG_ERROR",
          "The try-on service isn't set up for image generation yet.",
          503,
        );
      }
      return new TryOnError(
        "RATE_LIMITED",
        "The try-on service is busy right now. Wait a moment and try again.",
        429,
      );
    }
    if (err.status === 401 || err.status === 403) {
      return new TryOnError("CONFIG_ERROR", "The try-on service isn't configured correctly.", 500);
    }
    if (err.status === 400) {
      return new TryOnError(
        "PROVIDER_ERROR",
        "The AI service couldn't process these images. Try a different photo or outfit.",
        502,
      );
    }
  }
  return new TryOnError("PROVIDER_ERROR", "The AI service had a problem. Try again.", 502);
}

export const geminiProvider: TryOnProvider = {
  name: "gemini",

  async generate(input: TryOnInput, signal: AbortSignal): Promise<TryOnResult> {
    const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;

    let response;
    try {
      response = await getClient().models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { text: "IMAGE 1 (the person):" },
              {
                inlineData: {
                  mimeType: input.userImage.mimeType,
                  data: toBase64(input.userImage.data),
                },
              },
              { text: "IMAGE 2 (the clothing item):" },
              {
                inlineData: {
                  mimeType: input.clothingImage.mimeType,
                  data: toBase64(input.clothingImage.data),
                },
              },
              { text: buildTryOnPrompt(input.productName) },
            ],
          },
        ],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
          // Portrait output to suit the mirror display.
          imageConfig: { aspectRatio: "3:4" },
          abortSignal: signal,
        },
      });
    } catch (err) {
      throw mapGeminiError(err, signal);
    }

    if (response.promptFeedback?.blockReason) {
      console.warn("[virtual-try-on] prompt blocked:", response.promptFeedback.blockReason);
      throw new TryOnError(
        "PROVIDER_BLOCKED",
        "The AI service declined these images. Try a different photo or outfit.",
        422,
      );
    }

    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p) => p.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      const finishReason = candidate?.finishReason;
      const text = candidate?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join(" ");
      console.warn("[virtual-try-on] no image returned", {
        finishReason,
        finishMessage: candidate?.finishMessage,
        text,
        candidates: response.candidates?.length ?? 0,
        promptFeedback: response.promptFeedback,
        safetyRatings: candidate?.safetyRatings,
        usage: response.usageMetadata,
      });

      if (finishReason && BLOCKED_FINISH_REASONS.has(finishReason)) {
        throw new TryOnError(
          "PROVIDER_BLOCKED",
          "The AI service declined these images. Try a different photo or outfit.",
          422,
        );
      }
      throw new TryOnError(
        "NO_IMAGE_RETURNED",
        "The AI service didn't return an image this time. Try again.",
        502,
      );
    }

    return {
      data: Buffer.from(imagePart.inlineData.data, "base64"),
      mimeType: imagePart.inlineData.mimeType ?? "image/png",
    };
  },
};
