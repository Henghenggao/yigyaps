# TODOS

## Security

### Anti-Training Detection Research

**What:** Research viable anti-training detection techniques that survive LLM tokenization.

**Why:** Unicode zero-width character steganography (the original plan) is defeated by LLM tokenizers stripping zero-width chars. Experts need assurance their knowledge isn't used for training without consent.

**Context:** CEO review (2026-04-09) removed watermarking from scope after cross-model analysis confirmed tokenization defeats it. Viable alternatives to investigate: statistical perturbation (inject subtle factual variations unique per caller, detect when those variations appear in model outputs), semantic fingerprinting (embed unique reasoning patterns that survive paraphrasing), canary tokens (include specific phrasing that can be detected in training data dumps). Start with statistical perturbation as most promising. See `docs/superpowers/specs/2026-03-14-yap-skill-capture-validation-design.md` for original watermark design.

**Effort:** L
**Priority:** P1
**Depends on:** InferenceEngine V1 shipping (need production invocation data to design perturbation strategy)

### SecureBuffer Native mlock Hardening

**What:** Research native C++ addon for memory locking (mlock) in SecureBuffer.

**Why:** Node.js Buffer.fill(0) doesn't reliably zero all copies. V8 GC may retain copies in old-gen heap, JIT code, or stack frames. String.toString creates immutable copies. Current implementation is defense-in-depth, not guarantee.

**Context:** mlock(2) pins memory pages, preventing OS swap. Would need native C++ addon (N-API). Alternatively, consider Rust-based addon via neon. Production deployment on Railway may not support mlock (check container capabilities). See `packages/api/src/middleware/memory-zeroizer.ts`. Acknowledged as honest trust boundary in CEO plan.

**Effort:** M
**Priority:** P3
**Depends on:** None

### Skill-Level Rate Limiting

**What:** Add configurable per-skill rate limits that creators can set.

**Why:** Current global rate limit (20 calls/10min per user x skill) may be too permissive for high-value skills handling sensitive expert knowledge.

**Context:** Some skills (medical, legal, financial) may need stricter rate limits. Creator should be able to set their own limit via skill settings. Implementation: add `rate_limit_per_10min` column to `yy_skill_packages` (nullable, falls back to global default). Check in the invoke middleware before quota check. See `packages/api/src/routes/security.ts` anti-scraping logic (lines ~450-470).

**Effort:** S
**Priority:** P1
**Depends on:** None

### InferenceEngine Output Validation

**What:** Add output validation to prevent LLM from regurgitating verbatim expert answers.

**Why:** Without output checking, an attacker could craft queries that cause the LLM to copy-paste expert answers verbatim, enabling knowledge extraction. Input sanitization and prompt delimiters are shipped, but output is unchecked.

**Context:** Implementation: after LLM generates response, fuzzy-match against decrypted expert_answer text. If similarity exceeds threshold (e.g., >80% Jaccard on token bigrams), flag the response and either paraphrase or reject. Must happen inside SecureBuffer context (answers are decrypted). See InferenceEngine RAG pipeline design in CEO plan.

**Effort:** M
**Priority:** P2
**Depends on:** InferenceEngine V1 shipping

## Infrastructure

### Embedding-Based RAG Retrieval

**What:** Add embedding-based retrieval to InferenceEngine for skills with 200+ QA pairs.

**Why:** V1 retrieves ALL QA pairs for a skill (fits in context at 15-100 pairs, ~20K tokens). Won't scale past 200 pairs without relevance ranking.

**Context:** Options: (1) pgvector extension + text-embedding-3-small embeddings stored alongside QA pairs, (2) keyword TF-IDF matching (no external API), (3) hybrid (keyword pre-filter + embedding re-rank). pgvector is the cleanest long-term but adds a PostgreSQL extension dependency. TF-IDF is dependency-free but less accurate. Start with pgvector if Railway PostgreSQL supports it. See InferenceEngine design in CEO plan.

**Effort:** M
**Priority:** P2
**Depends on:** InferenceEngine V1 shipping, PostgreSQL pgvector extension availability on Railway

## Completed
