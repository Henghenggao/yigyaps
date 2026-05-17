import { describe, expect, it } from "vitest";
import {
  DekRecoveryError,
  EXPERT_SHARE_HEADER,
  SHAMIR_ONLY_ENCRYPTED_DEK,
  isShamirOnlyEncryptedDek,
  recoverDek,
  readExpertShareHeader,
} from "../../../src/lib/dek-policy.js";
import { ShamirManager } from "../../../src/lib/shamir.js";

describe("dek policy", () => {
  it("identifies Shamir-only DEK placeholders", () => {
    expect(isShamirOnlyEncryptedDek(SHAMIR_ONLY_ENCRYPTED_DEK)).toBe(true);
    expect(isShamirOnlyEncryptedDek("base64-kek-ciphertext")).toBe(false);
  });

  it("reads the expert share from the dedicated header", () => {
    expect(
      readExpertShareHeader({
        [EXPERT_SHARE_HEADER]: "share-2",
      }),
    ).toBe("share-2");
  });

  it("uses the first expert share header value when multiple are present", () => {
    expect(
      readExpertShareHeader({
        [EXPERT_SHARE_HEADER]: ["share-2", "ignored"],
      }),
    ).toBe("share-2");
  });

  it("recovers a Shamir DEK from platform share and expert share", async () => {
    const dek = Buffer.alloc(32, 7);
    const { shares } = ShamirManager.split(dek.toString("hex"));

    const result = await recoverDek({
      shares: [{ shareIndex: 1, shareData: shares[0] }],
      expertShare: shares[1],
      legacyEncryptedDek: "legacy-ciphertext",
      decryptLegacyDek: async () => {
        throw new Error("legacy fallback should not be used");
      },
    });

    expect(result.keyMode).toBe("shamir");
    expect(result.dek.equals(dek)).toBe(true);
  });

  it("requires expert share when a platform share exists", async () => {
    const { shares } = ShamirManager.split(Buffer.alloc(32, 8).toString("hex"));

    await expect(
      recoverDek({
        shares: [{ shareIndex: 1, shareData: shares[0] }],
        legacyEncryptedDek: "legacy-ciphertext",
        decryptLegacyDek: async () => Buffer.alloc(32, 1),
      }),
    ).rejects.toMatchObject({
      code: "SHAMIR_SHARE_REQUIRED",
    } satisfies Partial<DekRecoveryError>);
  });

  it("rejects invalid expert share values", async () => {
    const { shares } = ShamirManager.split(Buffer.alloc(32, 9).toString("hex"));

    await expect(
      recoverDek({
        shares: [{ shareIndex: 1, shareData: shares[0] }],
        expertShare: "not-a-valid-share",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_EXPERT_SHARE",
    } satisfies Partial<DekRecoveryError>);
  });

  it("does not use KEK fallback for Shamir-only markers", async () => {
    let decryptCalls = 0;

    await expect(
      recoverDek({
        shares: [],
        legacyEncryptedDek: SHAMIR_ONLY_ENCRYPTED_DEK,
        decryptLegacyDek: async () => {
          decryptCalls += 1;
          return Buffer.alloc(32, 1);
        },
      }),
    ).rejects.toMatchObject({
      code: "DEK_RECOVERY_UNAVAILABLE",
    } satisfies Partial<DekRecoveryError>);

    expect(decryptCalls).toBe(0);
  });

  it("falls back to legacy KEK decryption when no platform share exists", async () => {
    const legacyDek = Buffer.alloc(32, 3);

    const result = await recoverDek({
      shares: [],
      legacyEncryptedDek: "legacy-ciphertext",
      decryptLegacyDek: async (encryptedDek) => {
        expect(encryptedDek).toBe("legacy-ciphertext");
        return legacyDek;
      },
    });

    expect(result.keyMode).toBe("legacy-kms");
    expect(result.dek).toBe(legacyDek);
  });
});
