/**
 * YigYaps Shamir Secret Sharing — PoC
 *
 * Splits a DEK into (2,3) Shamir shares so that no single party can decrypt alone:
 *   Share 1 → Platform database  (custodian: "platform")
 *   Share 2 → Expert local store (custodian: "expert", returned to client)
 *   Share 3 → Platform cold backup (custodian: "backup")
 *
 * Reconstructing the DEK requires any 2 of 3 shares.
 * Expert revocation = delete their Share 2 → crypto-shredding.
 *
 * Library: secrets.js-34r7h (MIT, pure JS, no native deps)
 *
 * License: Apache 2.0
 */

import secrets from "secrets.js-34r7h";

export interface ShamirSplitResult {
  /** The three hex-encoded Shamir shares */
  shares: [string, string, string];
  /** Minimum shares needed to reconstruct */
  threshold: 2;
}

export class ShamirManager {
  /**
   * Split a DEK (hex string) into 3 shares with threshold 2.
   * @param dekHex - The Data Encryption Key as a hex string (64 chars = 32 bytes)
   */
  static split(dekHex: string): ShamirSplitResult {
    if (dekHex.length !== 64) {
      throw new Error(
        `ShamirManager.split: expected 64-char hex DEK, got ${dekHex.length} chars`,
      );
    }
    const shares = secrets.share(dekHex, 3, 2) as [string, string, string];
    return { shares, threshold: 2 };
  }

  /**
   * Reconstruct the DEK from any 2+ shares.
   * @param shares - Array of hex-encoded Shamir shares (minimum 2)
   * @returns The original DEK as a hex string
   */
  static reconstruct(shares: string[]): string {
    if (shares.length < 2) {
      throw new Error(
        "ShamirManager.reconstruct: need at least 2 shares (threshold=2)",
      );
    }
    return secrets.combine(shares);
  }

  /**
   * Verify that a set of shares can reconstruct a known DEK hash.
   * Useful for integrity checks without exposing the DEK itself.
   */
  static verify(shares: string[], expectedDekHex: string): boolean {
    try {
      const reconstructed = ShamirManager.reconstruct(shares);
      return reconstructed === expectedDekHex;
    } catch {
      return false;
    }
  }
}
