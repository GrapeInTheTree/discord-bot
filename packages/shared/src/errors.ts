/**
 * Application error hierarchy. All thrown/returned errors should extend AppError
 * so the global handler can distinguish user-facing from internal failures.
 */
export abstract class AppError extends Error {
  public abstract readonly code: string;
  public abstract readonly userFacing: boolean;

  public constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    if (cause !== undefined && cause instanceof Error && 'stack' in cause) {
      this.stack = `${this.stack ?? ''}\nCaused by: ${cause.stack ?? String(cause)}`;
    }
  }
}

/** User-facing validation failure — show message in interaction reply. */
export class ValidationError extends AppError {
  public readonly code = 'VALIDATION_ERROR';
  public readonly userFacing = true;
}

/** User-facing permission denial. */
export class PermissionError extends AppError {
  public readonly code = 'PERMISSION_ERROR';
  public readonly userFacing = true;
}

/** User-facing not-found. */
export class NotFoundError extends AppError {
  public readonly code = 'NOT_FOUND';
  public readonly userFacing = true;
}

/** User-facing conflict (e.g., already-open ticket). */
export class ConflictError extends AppError {
  public readonly code = 'CONFLICT';
  public readonly userFacing = true;
}

/** Internal failure — log + Sentry, surface generic message to user. */
export class InternalError extends AppError {
  public readonly code = 'INTERNAL_ERROR';
  public readonly userFacing = false;
}

/** Discord API error wrapper. */
export class DiscordApiError extends AppError {
  public readonly code = 'DISCORD_API_ERROR';
  public readonly userFacing = false;

  public constructor(
    message: string,
    public readonly httpStatus?: number,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}
