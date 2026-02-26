import { z } from "zod";

const envSchema = z.object({
    // Required
    DATABASE_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32),
    JWT_SECRET: z.string().min(32),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),

    // Optional with defaults
    PORT: z.coerce.number().default(3100),
    HOST: z.string().default("0.0.0.0"),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    // CORS & URLs
    CORS_ORIGIN: z.string().default(""),
    YIGYAPS_API_URL: z.string().url().optional(),
    GITHUB_CALLBACK_URL: z.string().url().optional(),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),

    // DB Pool
    DB_POOL_MAX: z.coerce.number().default(20),
    DB_POOL_IDLE_TIMEOUT: z.coerce.number().default(30000),
    DB_POOL_CONN_TIMEOUT: z.coerce.number().default(10000),

    // KMS - Key Encryption Key (64 hex chars = 32 bytes)
    KMS_KEK: z.string().length(64).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
}

export const env = parsed.data;
