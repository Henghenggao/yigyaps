export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3100";

export class ApiError extends Error {
  public status: number;
  public data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function fetchApi<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: "include", // Automatically send cookies
  };

  // 30s timeout
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 30000);
  config.signal = controller.signal;

  try {
    const response = await fetch(url, config);
    clearTimeout(id);

    if (!response.ok) {
      // Handle known status codes centrally (e.g. 401 could dispatch a logout event, etc.)
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || response.statusText;

      if (response.status === 401) {
        // Trigger global auth expiration event for automatic logout
        window.dispatchEvent(new Event("auth:expired"));
        console.warn("Unauthorized request, triggering automatic logout.");
      } else if (response.status === 429) {
        console.warn("Rate limit exceeded.");
      }

      throw new ApiError(response.status, message, errorData);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(id);
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or parse errors
    throw new Error(
      error instanceof Error ? error.message : "Unknown network error",
      { cause: error },
    );
  }
}
