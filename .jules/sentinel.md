<<<<<<< HEAD
## 2024-11-20 - Stored XSS via unsafe URL protocols

**Vulnerability:** Found `z.string().url()` validation without protocol restriction across multiple URL inputs (authorUrl, mcpUrl, repositoryUrl, homepageUrl) in the package API.

**Learning:** Zod's default `.url()` validator allows dangerous protocols like `javascript:`, which can lead to Stored XSS when these URLs are subsequently rendered on the frontend.

**Prevention:** Always combine `z.string().url()` with a `.refine()` rule that explicitly enforces `http://` or `https://` (e.g., checking `toLowerCase().startsWith('http://')`) to ensure URLs use safe protocols.
=======
## 2025-02-28 - Insecure Randomness for Resource IDs
**Vulnerability:** Weak, predictable IDs using `Math.random().toString(36).slice(2, 8)` were found in the API endpoints responsible for generating IDs for installations, packages, mints, and reviews. `Math.random()` is not cryptographically secure, and the IDs could potentially be guessed or collision-prone.
**Learning:** Even internal resource identifiers shouldn't rely on predictable pseudo-random number generators like `Math.random()` to ensure uniqueness and security.
**Prevention:** Always use cryptographically secure random generation (e.g., `crypto.randomBytes()`) when creating random IDs, tokens, or identifiers.
>>>>>>> feature/google-oauth
