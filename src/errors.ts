export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "AI_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "CONFIG_ERROR"
  | "PERSISTENCE_ERROR";

export class AppError extends Error {
  constructor(
    message: string,
    readonly code: ErrorCode,
    readonly recoverable: boolean,
  ) {
    super(message);
    this.name = "AppError";
  }

  toDisplayError() {
    return `${this.message} (code: ${this.code})`;
  }

  toString() {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

export function toDisplayError(err: unknown): string {
  if (err instanceof AppError) return err.toString();
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred";
}
