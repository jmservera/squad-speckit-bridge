/**
 * T036 + T027: Diagnostic Logger
 *
 * Provides verbose logging when --verbose flag is set.
 * Outputs diagnostic info to stderr to keep stdout clean for machine parsing.
 */

export interface Logger {
  verbose(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export function createLogger(options: { verbose: boolean; quiet: boolean }): Logger {
  return {
    verbose(message: string): void {
      if (options.verbose) {
        console.error(`[DEBUG] ${message}`);
      }
    },
    info(message: string): void {
      if (!options.quiet) {
        console.error(`[INFO] ${message}`);
      }
    },
    warn(message: string): void {
      console.error(`[WARN] ${message}`);
    },
    error(message: string): void {
      console.error(`[ERROR] ${message}`);
    },
  };
}

/**
 * Creates a no-op logger that silently discards all messages.
 * Used as a default when no logger is provided.
 */
export function createNullLogger(): Logger {
  const noop = (): void => {};
  return { verbose: noop, info: noop, warn: noop, error: noop };
}
