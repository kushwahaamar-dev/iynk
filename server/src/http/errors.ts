export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown[];

  constructor(status: number, code: string, message: string, details?: unknown[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export const unauthorized = (): ApiError => new ApiError(401, "unauthorized", "Sign in again to continue.");

export function errorBody(e: ApiError, requestId: string): { error: Record<string, unknown> } {
  const error: Record<string, unknown> = { code: e.code, message: e.message, requestId };
  if (e.details !== undefined) error["details"] = e.details;
  return { error };
}
