## 2024-05-24 - Stored XSS via Zod URL Validation
**Vulnerability:** In `@yigyaps/api`, `z.string().url()` was used to validate user-submitted URLs for fields like `authorUrl`, `homepageUrl`, etc. By default, `z.string().url()` allows potentially dangerous protocols like `javascript:`.
**Learning:** This exposes the application to Stored XSS if these user-submitted URLs are directly rendered as `href` attributes on the frontend, allowing attackers to execute arbitrary JavaScript when the user clicks the link.
**Prevention:** Always combine `z.string().url()` with `.refine()` to enforce safe protocols, typically `http://` or `https://` (e.g., `url.toLowerCase().startsWith('http://') || url.toLowerCase().startsWith('https://')`).
