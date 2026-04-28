// Re-export the shared Result type so server actions can use it without
// reaching into the package directly. Convenience only; same module.
export { err, fromPromise, isErr, isOk, ok, type Result } from '@discord-bot/shared';

export {
  ConflictError,
  DiscordApiError,
  InternalError,
  NotFoundError,
  PermissionError,
  ValidationError,
} from '@discord-bot/shared';
