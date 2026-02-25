/**
 * YigYaps Security Client — for MVP Enclave API interactions
 *
 * Used to communicate with the MVP Security Vault (/v1/security).
 *
 * License: Apache 2.0
 */

export interface SecurityClientOptions {
    baseUrl?: string;
    apiKey?: string;
}

export class YigYapsSecurityClient {
    private baseUrl: string;
    private headers: Record<string, string>;

    constructor(options: SecurityClientOptions = {}) {
        this.baseUrl = options.baseUrl ?? "https://api.yigyaps.com";
        this.headers = {
            "Content-Type": "application/json",
            ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        };
    }

    /**
     * Pushes raw plaintext rules into the pipeline to be Envelope Encrypted.
     */
    async encryptKnowledge(
        packageId: string,
        plaintextRules: string
    ): Promise<{ success: boolean; message: string }> {
        const res = await fetch(
            `${this.baseUrl}/v1/security/knowledge/${encodeURIComponent(packageId)}`,
            {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify({ plaintextRules }),
            }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(
                `YigYaps security encryptKnowledge failed: ${res.status} ${JSON.stringify(err)}`
            );
        }
        return res.json() as Promise<{ success: boolean; message: string }>;
    }

    /**
     * Simulates an agent hitting the Encrypted Virtual Room (EVR).
     */
    async invokeEvr(packageId: string): Promise<{ success: boolean; conclusion: string; disclaimer: string }> {
        const res = await fetch(
            `${this.baseUrl}/v1/security/invoke/${encodeURIComponent(packageId)}`,
            {
                method: "POST",
                headers: this.headers,
            }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(
                `YigYaps security invokeEvr failed: ${res.status} ${JSON.stringify(err)}`
            );
        }
        return res.json() as Promise<{ success: boolean; conclusion: string; disclaimer: string }>;
    }
}
