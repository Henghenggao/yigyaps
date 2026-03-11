## 2024-11-20 - Stored XSS via unsafe URL protocols

**Vulnerability:** Found `z.string().url()` validation without protocol restriction across multiple URL inputs (authorUrl, mcpUrl, repositoryUrl, homepageUrl) in the package API.

**Learning:** Zod's default `.url()` validator allows dangerous protocols like `javascript:`, which can lead to Stored XSS when these URLs are subsequently rendered on the frontend.

**Prevention:** Always combine `z.string().url()` with a `.refine()` rule that explicitly enforces `http://` or `https://` (e.g., checking `toLowerCase().startsWith('http://')`) to ensure URLs use safe protocols.
