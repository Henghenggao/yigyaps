/**
 * Sanitizes URLs to prevent XSS attacks via javascript: protocol
 *
 * Only allows https:// protocol for security.
 * Returns empty string for invalid or dangerous URLs.
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);

    // Only allow HTTPS protocol (most secure)
    if (parsed.protocol === "https:") {
      return trimmed;
    }

    // Reject all other protocols (http:, javascript:, data:, etc.)
    console.warn(
      `Blocked potentially dangerous URL protocol: ${parsed.protocol}`,
    );
    return "";
  } catch {
    // Invalid URL format
    console.warn(`Blocked invalid URL: ${trimmed}`);
    return "";
  }
}
