export type ErrorCode =
  | "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "LOCKED" | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, RATE_LIMITED: 429, LOCKED: 423, INTERNAL: 500,
};

export class AppError extends Error {
  readonly status: number;
  constructor(readonly code: ErrorCode, message: string, readonly fields?: Record<string, string>) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

/** Duck-typing: bundler co the nhan doi module (route vs container) lam instanceof sai */
export const isAppError = (e: unknown): e is AppError =>
  e instanceof AppError || (e instanceof Error && e.name === "AppError" && typeof (e as { code?: unknown }).code === "string" && typeof (e as { status?: unknown }).status === "number");
