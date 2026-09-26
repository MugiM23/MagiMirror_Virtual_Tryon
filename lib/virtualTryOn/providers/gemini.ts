import {
  ApiError,
  FinishReason,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  Modality,
  Type,
  type SafetySetting,
} from "@google/genai";
import { isGarmentSize } from "@/lib/products";
import { TryOnError } from "../errors";
import { PHOTO_CHECK_PROMPT, buildJewelleryPrompt, buildTryOnPrompt } from "../prompt";
import type { BodyPart, PhotoCheck, PhotoIssue, TryOnProvider } from "../types";

// "Nano Banana 2". Unlike gemini-2.5-flash-image it actually swaps the customer's clothes
// instead of layering the new item over them. Override with GEMINI_IMAGE_MODEL.
const DEFAULT_MODEL = "gemini-3.1-flash-image";
// Fast text model that screens photos. Override with GEMINI_CHECK_MODEL.
const DEFAULT_CHECK_MODEL = "gemini-3.5-flash-lite";

// Gemini's own filter as a backstop to our photo checks. BLOCK_LOW_AND_ABOVE is stricter,
// but it also blocks ordinary catalogue items like slit gowns and strappy dresses.
const SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

const PHOTO_ISSUES: PhotoIssue[] = ["none", "nudity", "underwear", "sexual", "no_person"];
const BODY_PARTS: BodyPart[] = ["neck", "ears", "wrists", "hands"];

const PHOTO_CHECK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    issue: { type: Type.STRING, enum: PHOTO_ISSUES },
    clothing: { type: Type.STRING },
    collection: { type: Type.STRING, enum: ["men", "women", "unknown"] },
    visibleParts: { type: Type.ARRAY, items: { type: Type.STRING, enum: BODY_PARTS } },
    estimatedSize: { type: Type.STRING, enum: ["S", "M", "L", "XL", "unknown"] },
  },
  required: ["issue", "clothing", "collection", "visibleParts", "estimatedSize"],
};

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

type GenerateParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

/** Gemini returns sporadic 500/503s; one quick retry clears most of them. */
async function generateWithRetry(params: GenerateParams, signal: AbortSignal) {
  try {
    return await getClient().models.generateContent(params);
  } catch (err) {
    if (signal.aborted || !(err instanceof ApiError) || (err.status !== 500 && err.status !== 503)) throw err;
    console.warn(`[virtual-try-on] Gemini ${err.status}, retrying once`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return await getClient().models.generateContent(params);
  }
}

function checkFailed(): TryOnError {
  return new TryOnError("SAFETY_CHECK_FAILED", "We couldn't check your photo just now. Try again.", 502);
}

export const geminiProvider: TryOnProvider = {
  name: "gemini",

  async checkPhoto(image, signal): Promise<PhotoCheck> {
    const model = process.env.GEMINI_CHECK_MODEL || DEFAULT_CHECK_MODEL;

    let response;
    try {
      response = await generateWithRetry({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: image.mimeType, data: toBase64(image.data) } },
              { text: PHOTO_CHECK_PROMPT },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: PHOTO_CHECK_SCHEMA,
          temperature: 0,
          safetySettings: SAFETY_SETTINGS,
          abortSignal: signal,
        },
      }, signal);
    } catch (err) {
      const mapped = mapGeminiError(err, signal);
      // Keep timeouts, quota and config errors as they are; anything else fails closed.
      if (mapped.code === "PROVIDER_ERROR") throw checkFailed();
      throw mapped;
    }

    // Gemini refusing to even look at the photo on safety grounds is itself a "no".
    const finishReason = response.candidates?.[0]?.finishReason;
    if (response.promptFeedback?.blockReason || (finishReason && BLOCKED_FINISH_REASONS.has(finishReason))) {
      console.warn("[virtual-try-on] photo check blocked by Gemini:", response.promptFeedback?.blockReason ?? finishReason);
      return { allowed: false, issue: "nudity", estimatedSize: null, collection: null, visibleParts: [], clothing: null };
    }

    let parsed: {
      issue?: unknown;
      estimatedSize?: unknown;
      collection?: unknown;
      visibleParts?: unknown;
      clothing?: unknown;
    };
    try {
      parsed = JSON.parse(response.text ?? "");
    } catch {
      console.error("[virtual-try-on] photo check returned invalid JSON");
      throw checkFailed();
    }
    const issue = PHOTO_ISSUES.find((i) => i === parsed.issue);
    if (!issue) {
      console.error("[virtual-try-on] photo check returned an unknown issue:", parsed.issue);
      throw checkFailed();
    }
    return {
      allowed: issue === "none",
      issue,
      estimatedSize: isGarmentSize(parsed.estimatedSize) ? parsed.estimatedSize : null,
      collection: parsed.collection === "men" || parsed.collection === "women" ? parsed.collection : null,
      visibleParts: Array.isArray(parsed.visibleParts)
        ? BODY_PARTS.filter((p) => (parsed.visibleParts as unknown[]).includes(p))
        : [],
      // Goes into the try-on prompt, so keep it short and plain.
      clothing:
        typeof parsed.clothing === "string" && parsed.clothing.trim()
          ? parsed.clothing.replace(/[^\p{L}\p{N} ,'-]/gu, "").trim().slice(0, 200) || null
          : null,
    };
  },

  async generate(input, signal) {
    const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;

    let response;
    try {
      response = await generateWithRetry({
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
              { text: input.placement ? "IMAGE 2 (the jewellery):" : "IMAGE 2 (the clothing item):" },
              {
                inlineData: {
                  mimeType: input.clothingImage.mimeType,
                  data: toBase64(input.clothingImage.data),
                },
              },
              {
                text: input.placement
                  ? buildJewelleryPrompt({ productName: input.productName, placement: input.placement })
                  : buildTryOnPrompt({
                      productName: input.productName,
                      layer: input.layer,
                      size: input.size,
                      personSize: input.personSize,
                      currentClothing: input.currentClothing,
                    }),
              },
            ],
          },
        ],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
          // Portrait output to suit the mirror display.
          imageConfig: { aspectRatio: "3:4" },
          safetySettings: SAFETY_SETTINGS,
          abortSignal: signal,
        },
      }, signal);
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
      console.warn(
        "[virtual-try-on] no image returned",
        JSON.stringify({
          finishReason,
          finishMessage: candidate?.finishMessage,
          text,
          candidates: response.candidates?.length ?? 0,
          promptFeedback: response.promptFeedback,
          safetyRatings: candidate?.safetyRatings,
        }),
      );

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
