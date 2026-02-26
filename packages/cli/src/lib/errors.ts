/**
 * CLI Error Class
 *
 * Standardizes exit codes and error types across the CLI.
 *
 * Exit Codes:
 * 0 - Success
 * 1 - User Error (invalid input, missing files, etc.)
 * 2 - System Error (unexpected bugs, environment issues)
 * 3 - Network Error (API down, timeout)
 */
export class CliError extends Error {
  constructor(
    public message: string,
    public exitCode: number = 1,
  ) {
    super(message);
    this.name = "CliError";
  }

  static user(message: string): CliError {
    return new CliError(message, 1);
  }

  static system(message: string): CliError {
    return new CliError(message, 2);
  }

  static network(message: string): CliError {
    return new CliError(message, 3);
  }
}

/**
 * Global Error Handler
 */
export async function handleGlobalError(error: unknown) {
  const { logger } = await import("./logger.js");

  if (error instanceof CliError) {
    logger.error(error.message);
    process.exit(error.exitCode);
  }

  const message = error instanceof Error ? error.message : String(error);
  logger.error(`An unexpected error occurred: ${message}`);
  process.exit(2);
}
