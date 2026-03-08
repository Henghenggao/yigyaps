## 2024-05-24 - Zod URL Validation XSS Risk
**Vulnerability:** Zod's `z.string().url()` allows dangerous protocols like `javascript:`, which can lead to Stored XSS when user-supplied URLs (like homepage URLs or author URLs) are rendered in links `href="..."`.
**Learning:** `z.string().url()` only verifies the string is a valid URL according to the WHATWG spec, not that it is a safe scheme. We must explicitly restrict the scheme.
**Prevention:** Always combine `z.string().url()` with `.refine()` to enforce safe schemes like `http://` or `https://` (e.g., `.refine((url) => url.toLowerCase().startsWith('http://') || url.toLowerCase().startsWith('https://'))`) when URLs will be rendered in the application.
