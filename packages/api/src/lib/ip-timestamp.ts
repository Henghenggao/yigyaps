/**
 * YigYaps IP Timestamp Proof
 *
 * Replaces the mock `blockchain_tx = crypto.randomBytes(32)` with a real,
 * verifiable timestamp proof.
 *
 * Strategy (from SKILL-PLATFORM-MVP-STRATEGY.md §3.2):
 *
 *   Primary (if GITHUB_EVIDENCE_TOKEN is set):
 *     Commit an evidence JSON file to the GitHub repository via the REST API.
 *     The returned commit SHA is publicly verifiable at:
 *       https://github.com/<GITHUB_EVIDENCE_REPO>/commit/<sha>
 *     Stored as: "github:<sha>"
 *
 *   Fallback (no GitHub token configured):
 *     HMAC-SHA256(secret, "<contentHash>:<timestamp>:<packageId>")
 *     Stored as: "sha256:<hex>"
 *     Verifiable by the platform using the same inputs + secret.
 *
 * Both forms are more trustworthy than a random 32-byte value.
 *
 * License: Apache 2.0
 */

import crypto from "node:crypto";
import { env } from "./env.js";

interface EvidenceRecord {
  packageId: string;
  contentHash: string;
  author: string;
  timestamp: string; // ISO-8601
  platform: "yigyaps";
  version: "1";
}

/**
 * Register an IP timestamp for a knowledge upload.
 *
 * @returns Proof string to store as `blockchain_tx`.
 *          Format: "github:<sha>" | "sha256:<hex>"
 */
export async function registerIpTimestamp(
  packageId: string,
  contentHash: string,
  authorId: string,
): Promise<string> {
  const record: EvidenceRecord = {
    packageId,
    contentHash,
    author: authorId,
    timestamp: new Date().toISOString(),
    platform: "yigyaps",
    version: "1",
  };

  // ── Primary path: commit to GitHub evidence branch ────────────────────────
  if (env.GITHUB_EVIDENCE_TOKEN && env.GITHUB_EVIDENCE_REPO) {
    try {
      const sha = await commitEvidenceToGithub(record);
      return `github:${sha}`;
    } catch (err) {
      // Fall through to HMAC fallback — non-fatal
      console.warn(
        "[ip-timestamp] GitHub evidence commit failed, using HMAC fallback:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // ── Fallback: HMAC-SHA256 self-certifying proof ───────────────────────────
  const secret = env.KMS_KEK ?? env.JWT_SECRET;
  const message = `${contentHash}:${record.timestamp}:${packageId}`;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  return `sha256:${hmac}`;
}

/**
 * Verify a sha256-type proof locally.
 * Returns true if the proof matches the given inputs.
 */
export function verifyHmacProof(
  proof: string,
  packageId: string,
  contentHash: string,
  timestamp: string,
): boolean {
  if (!proof.startsWith("sha256:")) return false;
  const storedHmac = proof.slice(7);
  const secret = env.KMS_KEK ?? env.JWT_SECRET;
  const message = `${contentHash}:${timestamp}:${packageId}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(storedHmac, "hex"),
    Buffer.from(expected, "hex"),
  );
}

// ── GitHub API helper ─────────────────────────────────────────────────────────

async function commitEvidenceToGithub(record: EvidenceRecord): Promise<string> {
  const [owner, repo] = (env.GITHUB_EVIDENCE_REPO ?? "").split("/");
  if (!owner || !repo) {
    throw new Error(
      "GITHUB_EVIDENCE_REPO must be in format 'owner/repo'",
    );
  }

  const token = env.GITHUB_EVIDENCE_TOKEN!;
  const filePath = `evidence/${record.packageId.replace(/\//g, "-")}-${Date.now()}.json`;
  const content = Buffer.from(JSON.stringify(record, null, 2)).toString(
    "base64",
  );
  const message = `IP registration: ${record.packageId}`;

  // GitHub Contents API: create file
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ message, content }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { commit?: { sha?: string } };
  const sha = data.commit?.sha;
  if (!sha) throw new Error("GitHub API returned no commit SHA");

  return sha;
}
