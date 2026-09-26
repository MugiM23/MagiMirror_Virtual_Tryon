export type TryOnErrorCode =
  | "BAD_REQUEST"
  | "MISSING_USER_IMAGE"
  | "MISSING_PRODUCT"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_IMAGE_UNAVAILABLE"
  | "INVALID_IMAGE_FORMAT"
  | "IMAGE_TOO_LARGE"
  | "CONFIG_ERROR"
  | "RATE_LIMITED"
  | "PROVIDER_BLOCKED"
  | "UNSAFE_PHOTO"
  | "NO_PERSON"
  | "WRONG_COLLECTION"
  | "PART_NOT_VISIBLE"
  | "UNSAFE_RESULT"
  | "SAFETY_CHECK_FAILED"
  | "PROVIDER_ERROR"
  | "NO_IMAGE_RETURNED"
  | "TIMEOUT";

/**
 * An error whose `message` is safe to show to the user.
 * Never put API keys, stack traces or raw provider responses in `message`;
 * log those on the server instead.
 */
export class TryOnError extends Error {
  constructor(
    public readonly code: TryOnErrorCode,
    message: string,
    public readonly status: number = 500,
  ) {
    super(message);
    this.name = "TryOnError";
  }
}
