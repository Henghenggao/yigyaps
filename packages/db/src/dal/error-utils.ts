/**
 * Database operation error utility.
 * Wraps async DB operations with consistent error context.
 */
export async function dbOperation<T>(
  fn: () => Promise<T>,
  context: { method: string; entity: string; id?: string },
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    error.message = `[${context.entity}.${context.method}${context.id ? `(${context.id})` : ""}] ${error.message}`;
    throw error;
  }
}
