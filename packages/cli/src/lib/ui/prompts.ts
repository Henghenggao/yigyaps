import * as p from "@clack/prompts";

/** Handles user cancellation from any @clack prompt */
export function assertNotCancelled<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Operation cancelled.");
    process.exit(0); // Exit gracefully on Ctrl+C
  }
  return value as T;
}

export { p };
