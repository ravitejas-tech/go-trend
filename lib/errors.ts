export const ERROR_CODES = {
  invalidInput: "invalid_input",
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  notFound: "not_found",
  uploadRejected: "upload_rejected",
  providerRateLimited: "provider_rate_limited",
  providerUnavailable: "provider_unavailable",
  providerMalformedResponse: "provider_malformed_response",
  generationTimedOut: "generation_timed_out",
  quotaExceeded: "quota_exceeded",
  internal: "internal",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const RETRYABLE_CODES = new Set<ErrorCode>([
  ERROR_CODES.providerRateLimited,
  ERROR_CODES.providerUnavailable,
  ERROR_CODES.generationTimedOut,
]);

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  [ERROR_CODES.invalidInput]: 400,
  [ERROR_CODES.unauthorized]: 401,
  [ERROR_CODES.forbidden]: 403,
  [ERROR_CODES.notFound]: 404,
  [ERROR_CODES.uploadRejected]: 422,
  [ERROR_CODES.providerRateLimited]: 429,
  [ERROR_CODES.providerUnavailable]: 503,
  [ERROR_CODES.providerMalformedResponse]: 502,
  [ERROR_CODES.generationTimedOut]: 504,
  [ERROR_CODES.quotaExceeded]: 429,
  [ERROR_CODES.internal]: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;

  constructor(code: ErrorCode, userMessage: string, options?: ErrorOptions) {
    super(`${code}: ${userMessage}`, options);
    this.name = "AppError";
    this.code = code;
    this.userMessage = userMessage;
  }

  get isRetryable() {
    return RETRYABLE_CODES.has(this.code);
  }

  get status() {
    return STATUS_BY_CODE[this.code];
  }
}

export function toAppError(error: unknown) {
  return error instanceof AppError
    ? error
    : new AppError(ERROR_CODES.internal, "Something went wrong.", {
        cause: error,
      });
}
