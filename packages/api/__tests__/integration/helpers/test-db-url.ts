/**
 * Integration tests must run through Vitest global setup so Testcontainers can
 * provide a migrated database. A fallback URL can accidentally point at a
 * drifted shared DB and hide migration bugs.
 */
export function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;

  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL must be set by Vitest global setup; refusing to run integration tests against a fallback database.",
    );
  }

  return url;
}
