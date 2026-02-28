/**
 * Unit tests for ShamirManager — (2,3) threshold secret sharing PoC.
 *
 * Verifies:
 *   1. split() produces exactly 3 shares
 *   2. Any 2 shares can reconstruct the original DEK
 *   3. A single share cannot reconstruct
 *   4. Invalid inputs are rejected
 *
 * License: Apache 2.0
 */

import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { ShamirManager } from "../../../src/lib/shamir.js";

// Generate a realistic 32-byte DEK as hex
const DEK_HEX = crypto.randomBytes(32).toString("hex");

describe("ShamirManager", () => {
  describe("split", () => {
    it("produces 3 shares with threshold 2", () => {
      const result = ShamirManager.split(DEK_HEX);
      expect(result.shares).toHaveLength(3);
      expect(result.threshold).toBe(2);
      // Each share should be a non-empty hex string
      for (const share of result.shares) {
        expect(share.length).toBeGreaterThan(0);
      }
    });

    it("rejects non-64-char hex input", () => {
      expect(() => ShamirManager.split("abcd")).toThrow("expected 64-char hex DEK");
      expect(() => ShamirManager.split("ff".repeat(16))).toThrow("expected 64-char hex DEK");
    });
  });

  describe("reconstruct", () => {
    const { shares } = ShamirManager.split(DEK_HEX);

    it("reconstructs from shares 1+2 (platform + expert)", () => {
      const result = ShamirManager.reconstruct([shares[0], shares[1]]);
      expect(result).toBe(DEK_HEX);
    });

    it("reconstructs from shares 1+3 (platform + backup)", () => {
      const result = ShamirManager.reconstruct([shares[0], shares[2]]);
      expect(result).toBe(DEK_HEX);
    });

    it("reconstructs from shares 2+3 (expert + backup)", () => {
      const result = ShamirManager.reconstruct([shares[1], shares[2]]);
      expect(result).toBe(DEK_HEX);
    });

    it("reconstructs from all 3 shares", () => {
      const result = ShamirManager.reconstruct([shares[0], shares[1], shares[2]]);
      expect(result).toBe(DEK_HEX);
    });

    it("rejects fewer than 2 shares", () => {
      expect(() => ShamirManager.reconstruct([shares[0]])).toThrow("need at least 2 shares");
      expect(() => ShamirManager.reconstruct([])).toThrow("need at least 2 shares");
    });
  });

  describe("verify", () => {
    const { shares } = ShamirManager.split(DEK_HEX);

    it("returns true for valid shares + matching DEK", () => {
      expect(ShamirManager.verify([shares[0], shares[1]], DEK_HEX)).toBe(true);
    });

    it("returns false for valid shares + wrong DEK", () => {
      const wrongDek = crypto.randomBytes(32).toString("hex");
      expect(ShamirManager.verify([shares[0], shares[1]], wrongDek)).toBe(false);
    });
  });

  describe("round-trip with KMS-like workflow", () => {
    it("split → store platform+backup → reconstruct with platform+expert", () => {
      // Simulate the full encrypt → invoke flow
      const dek = crypto.randomBytes(32);
      const dekHex = dek.toString("hex");

      // Encrypt: split DEK
      const { shares } = ShamirManager.split(dekHex);
      const platformShare = shares[0]; // stored in DB
      const expertShare = shares[1];   // returned to expert
      // shares[2] = backup, stored separately

      // Invoke: expert provides their share
      const reconstructed = ShamirManager.reconstruct([platformShare, expertShare]);
      const reconstructedDek = Buffer.from(reconstructed, "hex");

      expect(reconstructedDek.equals(dek)).toBe(true);
    });
  });
});
