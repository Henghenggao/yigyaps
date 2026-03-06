## 2025-02-05 - Zod `z.string().url()` XSS Vulnerability
**Vulnerability:** The Zod validation `z.string().url()` permits dangerous protocols like `javascript:`, which could lead to Stored XSS when user-provided URLs (like `authorUrl`, `homepageUrl`) are eventually rendered.
**Learning:** Zod's built-in URL validation only verifies URL structure, not the safety of the protocol itself.
**Prevention:** Always pair `z.string().url()` with `.refine((url) => url.toLowerCase().startsWith('http'))` when validating URLs intended for rendering, to restrict protocols to HTTP/HTTPS.
