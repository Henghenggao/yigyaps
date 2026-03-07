## 2024-05-18 - Stored XSS via insecure URL protocols
**Vulnerability:** Zod's `z.string().url()` allows dangerous protocols like `javascript:`. If these URLs are later rendered as links in the frontend, they can lead to Stored XSS.
**Learning:** `z.string().url()` only checks if the string is *some* kind of valid URL but does not restrict it to safe protocols (e.g. `http://` or `https://`).
**Prevention:** Always combine `z.string().url()` with `.refine()` to enforce safe protocols. For example: `z.string().url().refine(u => u.toLowerCase().startsWith('http://') || u.toLowerCase().startsWith('https://'), { message: "URL must use http or https protocol" })`.
