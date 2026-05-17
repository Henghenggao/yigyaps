/**
 * Knowledge leakage guard.
 *
 * Blocks responses that copy long verbatim spans from protected expert
 * knowledge. The detector intentionally returns metadata only; it never
 * exposes the matched source fragment back to the caller or logs.
 */

export interface LeakageMatch {
  sourceIndex: number;
  reason: "long_verbatim_span" | "short_verbatim_answer" | "high_entropy_token";
  wordCount?: number;
  charCount?: number;
}

export interface LeakageCheckResult {
  blocked: boolean;
  matches: LeakageMatch[];
}

export interface SanitizedKnowledgeOutput {
  text: string;
  leakageBlocked: boolean;
  leakageMatches: LeakageMatch[];
}

const LONG_SPAN_WORDS = 24;
const SHORT_ANSWER_MIN_CHARS = 80;
const MIN_WORDS_FOR_LONG_SPAN = LONG_SPAN_WORDS + 4;
const MAX_CHUNKS_PER_SOURCE = 250;

const LEAKAGE_BLOCKED_TEXT =
  "Response withheld because it too closely matched protected expert source material. Ask for a summary, recommendation, or application of the skill rather than raw source knowledge.";

export function checkKnowledgeLeakage(
  generatedText: string,
  protectedTexts: string[],
): LeakageCheckResult {
  const output = normalizeForLeakage(generatedText);
  const outputTokens = extractHighEntropyTokens(generatedText);
  const matches: LeakageMatch[] = [];

  if (!output && outputTokens.size === 0) {
    return { blocked: false, matches };
  }

  protectedTexts.forEach((protectedText, sourceIndex) => {
    const normalized = normalizeForLeakage(protectedText);
    if (!normalized) return;

    const words = normalized.split(" ");

    if (
      normalized.length >= SHORT_ANSWER_MIN_CHARS &&
      words.length < MIN_WORDS_FOR_LONG_SPAN &&
      output.includes(normalized)
    ) {
      matches.push({
        sourceIndex,
        reason: "short_verbatim_answer",
        charCount: normalized.length,
      });
      return;
    }

    if (words.length >= MIN_WORDS_FOR_LONG_SPAN) {
      const chunkLimit = Math.min(
        words.length - LONG_SPAN_WORDS + 1,
        MAX_CHUNKS_PER_SOURCE,
      );

      for (let start = 0; start < chunkLimit; start += 1) {
        const fragment = words.slice(start, start + LONG_SPAN_WORDS).join(" ");
        if (output.includes(fragment)) {
          matches.push({
            sourceIndex,
            reason: "long_verbatim_span",
            wordCount: LONG_SPAN_WORDS,
          });
          return;
        }
      }
    }

    const protectedTokens = extractHighEntropyTokens(protectedText);
    for (const token of protectedTokens) {
      if (outputTokens.has(token)) {
        matches.push({
          sourceIndex,
          reason: "high_entropy_token",
          charCount: token.length,
        });
        return;
      }
    }
  });

  return { blocked: matches.length > 0, matches };
}

export function sanitizeKnowledgeOutput(
  generatedText: string,
  protectedTexts: string[],
): SanitizedKnowledgeOutput {
  const leakage = checkKnowledgeLeakage(generatedText, protectedTexts);
  if (!leakage.blocked) {
    return {
      text: generatedText,
      leakageBlocked: false,
      leakageMatches: [],
    };
  }

  return {
    text: LEAKAGE_BLOCKED_TEXT,
    leakageBlocked: true,
    leakageMatches: leakage.matches,
  };
}

function normalizeForLeakage(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHighEntropyTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  const matches = text.match(/[A-Za-z0-9_-]{24,}/g) ?? [];

  for (const rawToken of matches) {
    const token = rawToken.toLowerCase();
    const uniqueChars = new Set(token).size;
    if (uniqueChars >= 10 && /[a-z]/.test(token) && /\d/.test(token)) {
      tokens.add(token);
    }
  }

  return tokens;
}
