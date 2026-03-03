## 2025-02-28 - Insecure Randomness for Resource IDs
**Vulnerability:** Weak, predictable IDs using `Math.random().toString(36).slice(2, 8)` were found in the API endpoints responsible for generating IDs for installations, packages, mints, and reviews. `Math.random()` is not cryptographically secure, and the IDs could potentially be guessed or collision-prone.
**Learning:** Even internal resource identifiers shouldn't rely on predictable pseudo-random number generators like `Math.random()` to ensure uniqueness and security.
**Prevention:** Always use cryptographically secure random generation (e.g., `crypto.randomBytes()`) when creating random IDs, tokens, or identifiers.
