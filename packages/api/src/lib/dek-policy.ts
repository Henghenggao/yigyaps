/**
 * DEK recovery policy helpers.
 *
 * New Shamir-protected uploads intentionally do not store a KEK-encrypted DEK.
 * The encrypted_dek column is still non-null for legacy schema compatibility,
 * so this marker tells runtime code that KEK fallback is not allowed.
 */

import { ShamirManager } from "./shamir.js";

export const SHAMIR_ONLY_ENCRYPTED_DEK = "shamir-only:v1";
export const EXPERT_SHARE_HEADER = "x-yigyaps-expert-share";

export type DekKeyMode = "shamir" | "legacy-kms";

export type DekRecoveryErrorCode =
  | "SHAMIR_SHARE_REQUIRED"
  | "INVALID_EXPERT_SHARE"
  | "DEK_RECOVERY_UNAVAILABLE"
  | "LEGACY_DEK_DECRYPT_FAILED";

export class DekRecoveryError extends Error {
  constructor(
    public readonly code: DekRecoveryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DekRecoveryError";
  }
}

export interface DekShare {
  shareIndex: number;
  shareData: string;
}

export interface RecoverDekOptions {
  shares: DekShare[];
  expertShare?: string;
  legacyEncryptedDek?: string | null;
  decryptLegacyDek?: (encryptedDek: string) => Promise<Buffer>;
}

export function isShamirOnlyEncryptedDek(encryptedDek: string): boolean {
  return encryptedDek === SHAMIR_ONLY_ENCRYPTED_DEK;
}

export function readExpertShareHeader(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const value = headers[EXPERT_SHARE_HEADER];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export async function recoverDek({
  shares,
  expertShare,
  legacyEncryptedDek,
  decryptLegacyDek,
}: RecoverDekOptions): Promise<{ dek: Buffer; keyMode: DekKeyMode }> {
  const platformShare = shares.find((share) => share.shareIndex === 1);

  if (platformShare) {
    if (!expertShare) {
      throw new DekRecoveryError(
        "SHAMIR_SHARE_REQUIRED",
        "Expert share is required for Shamir-protected knowledge.",
      );
    }

    try {
      const dekHex = ShamirManager.reconstruct([
        platformShare.shareData,
        expertShare,
      ]);
      if (!/^[0-9a-f]{64}$/i.test(dekHex)) {
        throw new Error("reconstructed DEK is not a 32-byte hex value");
      }
      return { dek: Buffer.from(dekHex, "hex"), keyMode: "shamir" };
    } catch (error) {
      throw new DekRecoveryError(
        "INVALID_EXPERT_SHARE",
        "Expert share could not reconstruct the DEK.",
        { cause: error },
      );
    }
  }

  if (
    !legacyEncryptedDek ||
    isShamirOnlyEncryptedDek(legacyEncryptedDek) ||
    !decryptLegacyDek
  ) {
    throw new DekRecoveryError(
      "DEK_RECOVERY_UNAVAILABLE",
      "No usable DEK recovery path is available.",
    );
  }

  try {
    return {
      dek: await decryptLegacyDek(legacyEncryptedDek),
      keyMode: "legacy-kms",
    };
  } catch (error) {
    throw new DekRecoveryError(
      "LEGACY_DEK_DECRYPT_FAILED",
      "Legacy KEK DEK decryption failed.",
      { cause: error },
    );
  }
}
