/**
 * YigYaps Security Routes MVP
 *
 * Implements endpoints to test the Encryption Pipeline (Phase 1)
 * and Software Enclave Isolation (Phase 2).
 *
 * License: Apache 2.0
 */

import { FastifyPluginAsync } from "fastify";
import { KMS } from "../lib/kms.js";
import { SecureBuffer } from "../middleware/memory-zeroizer.js";
import {
    encryptedKnowledgeTable,
    invocationLogsTable,
    ipRegistrationsTable,
} from "@yigyaps/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { randomUUID } from "crypto";

export const securityRoutes: FastifyPluginAsync = async (fastify) => {
    /**
     * Encrypt and store knowledge on the edge/client simulator
     * This represents the end of the "Extraction Pipeline" where data goes to the Vault.
     */
    fastify.post("/knowledge/:packageId", async (request, reply) => {
        const { packageId } = request.params as { packageId: string };
        const { plaintextRules } = request.body as { plaintextRules: string };

        if (!packageId || !plaintextRules) {
            return reply.code(400).send({ error: "Missing required fields" });
        }

        // 1. Generate DEK
        const dek = KMS.generateDek();

        // 2. Encrypt DEK with KEK (KMS Mock)
        const { encryptedDek } = await KMS.encryptDek(dek);

        // 3. Encrypt Knowledge using DEK
        const contentCiphertext = KMS.encryptKnowledge(plaintextRules, dek);

        // 4. Hash the original plaintext for IP Registration verification
        const contentHash = crypto.createHash("sha256").update(plaintextRules).digest("hex");

        // 4b. Mock Blockchain Transaction (Polygon RPC Simulated)
        const mockTxHash = `0x${crypto.randomBytes(32).toString("hex")}`;
        await fastify.db.insert(ipRegistrationsTable).values({
            id: randomUUID(),
            skillPackageId: packageId,
            contentHash,
            blockchainTx: mockTxHash,
            registeredAt: Date.now(),
        });

        // 5. Save to database
        await fastify.db.insert(encryptedKnowledgeTable).values({
            id: randomUUID(),
            skillPackageId: packageId,
            encryptedDek,
            contentCiphertext,
            contentHash,
            createdAt: Date.now(),
        });

        // Zeroize the local DEK memory (though JS GC handles it eventually, simulated here)
        // dek.fill(0);

        return reply.send({ success: true, message: "Knowledge encrypted and saved." });
    });

    /**
     * Simulate Invocation in the Memory-Only Sandbox
     * Decrypts in SecureBuffer, processes, then zeroizes immediately.
     */
    fastify.post("/invoke/:packageId", async (request, reply) => {
        const { packageId } = request.params as { packageId: string };

        const knowledgeRecords = await fastify.db
            .select()
            .from(encryptedKnowledgeTable)
            .where(eq(encryptedKnowledgeTable.skillPackageId, packageId))
            .limit(1);

        if (!knowledgeRecords.length) {
            return reply.code(404).send({ error: "No encrypted knowledge found for this skill." });
        }

        const record = knowledgeRecords[0];
        const encryptedDek = record.encryptedDek;
        const ciphertext = record.contentCiphertext;

        // Secure Pipeline
        const conclusion = await SecureBuffer.withSecureContext(
            async () => {
                // Fetch DEK securely from KMS
                return await KMS.decryptDek(encryptedDek);
            },
            async (dekBuffer) => {
                // We are now inside the Software Enclave / Sandbox
                // 1. Decrypt knowledge explicitly only in this scope
                const plaintextRules = KMS.decryptKnowledge(ciphertext as Buffer, dekBuffer);

                // 2. Mock RAG/Rule Engine processing
                // Instead of sending the full plaintextRules to an LLM, we resolve the score locally.
                const mockScore = Math.floor(Math.random() * 10) + 1;
                const generatedConclusion = `Evaluation Score: ${mockScore}/10. Match successful.`;

                // At the end of this scope, dekBuffer will be wiped by SecureBuffer
                return generatedConclusion;
            }
        );

        // Log the invocation (Auditing)
        const conclusionHash = crypto.createHash("sha256").update(conclusion).digest("hex");
        await fastify.db.insert(invocationLogsTable).values({
            id: randomUUID(),
            skillPackageId: packageId,
            apiClientId: "mock-agent-client-id", // Assume grabbed from Bearer token
            conclusionHash,
            createdAt: Date.now(),
        });

        // Firewall policy: We ONLY return the conclusion, never the original rules.
        return reply.send({
            success: true,
            conclusion,
            disclaimer: "Output is sanitized. Original rules were not leaked.",
        });
    });
};
