import { LogLevel } from '@sapphire/framework';

import { env } from '../config/env.js';

const LOG_LEVEL_MAP: Record<typeof env.LOG_LEVEL, LogLevel> = {
  trace: LogLevel.Trace,
  debug: LogLevel.Debug,
  info: LogLevel.Info,
  warn: LogLevel.Warn,
  error: LogLevel.Error,
  fatal: LogLevel.Fatal,
};

export const sapphireLogLevel: LogLevel = LOG_LEVEL_MAP[env.LOG_LEVEL];
