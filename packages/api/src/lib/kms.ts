/**
 * YigYaps KMS Integration — Envelope Encryption
 *
 * This service implements the AES-256-GCM envelope encryption strategy for the MVP phase.
 * It simulates a cloud KMS (AWS KMS, Google Cloud KMS, Vault) by using a locally
 * configured Master Key (KEK).
 *
 * License: Apache 2.0
 */

import crypto from "crypto";

const KEK_ID = "local-dev-kek";

/**
 * Initializes and validates the KMS Key Encryption Key (KEK).
 *
 * PRODUCTION: KMS_KEK environment variable MUST be set.
 * DEVELOPMENT: Uses random key with warning (data will not persist across restarts).
 */
function initializeKEK(): string {
    const kmsKek = process.env.KMS_KEK;
    const nodeEnv = process.env.NODE_ENV || 'development';

    if (nodeEnv === 'production') {
        if (!kmsKek) {
            throw new Error(
                '❌ FATAL: KMS_KEK environment variable is required in production. ' +
                'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
            );
        }
        if (kmsKek.length !== 64) {
            throw new Error('❌ FATAL: KMS_KEK must be exactly 64 hex characters (32 bytes).');
        }
        return kmsKek;
    }

    // Development/Test environment
    if (!kmsKek) {
        const randomKek = crypto.randomBytes(32).toString('hex');
        console.warn(
            '⚠️  WARNING: KMS_KEK not set in development environment.\n' +
            '⚠️  Using random key. Encrypted data will NOT persist across server restarts.\n' +
            '⚠️  Set KMS_KEK in .env to persist encrypted data.'
        );
        return randomKek;
    }

    return kmsKek;
}

const LOCAL_KEK = initializeKEK();

export class KMS {
    /**
     * Generates a new Data Encryption Key (DEK).
     */
    static generateDek(): Buffer {
        return crypto.randomBytes(32);
    }

    /**
     * Encrypts the DEK using the Master Key (KEK).
     * Mocks a KMS Encrypt network call.
     */
    static async encryptDek(dek: Buffer): Promise<{ encryptedDek: string; kekId: string }> {
        const kekBuffer = Buffer.from(LOCAL_KEK, 'hex');
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", kekBuffer, iv);

        const ciphertext = Buffer.concat([cipher.update(dek), cipher.final()]);
        const authTag = cipher.getAuthTag();

        const result = Buffer.concat([iv, authTag, ciphertext]).toString('base64');
        return {
            encryptedDek: result,
            kekId: KEK_ID,
        };
    }

    /**
     * Decrypts the Encrypted DEK using the Master Key (KEK).
     * Mocks a KMS Decrypt network call.
     */
    static async decryptDek(encryptedDekBase64: string): Promise<Buffer> {
        const data = Buffer.from(encryptedDekBase64, 'base64');
        const iv = data.subarray(0, 12);
        const authTag = data.subarray(12, 28);
        const ciphertext = data.subarray(28);

        const kekBuffer = Buffer.from(LOCAL_KEK, 'hex');
        const decipher = crypto.createDecipheriv("aes-256-gcm", kekBuffer, iv);
        decipher.setAuthTag(authTag);

        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }

    /**
     * Encrypts knowledge payload using AES-256-GCM with the plaintext DEK.
     */
    static encryptKnowledge(plaintext: string, dek: Buffer): Buffer {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);

        // We store the IV + AuthTag + Ciphertext together in one Buffer 
        // to map to the bytea / Buffer field in Drizzle.
        const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
        const authTag = cipher.getAuthTag();

        return Buffer.concat([iv, authTag, ciphertext]);
    }

    /**
     * Decrypts knowledge payload using AES-256-GCM with the plaintext DEK.
     */
    static decryptKnowledge(payload: Buffer, dek: Buffer): string {
        const iv = payload.subarray(0, 12);
        const authTag = payload.subarray(12, 28);
        const ciphertext = payload.subarray(28);

        const decipher = crypto.createDecipheriv("aes-256-gcm", dek, iv);
        decipher.setAuthTag(authTag);

        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return plaintext.toString("utf8");
    }
}
