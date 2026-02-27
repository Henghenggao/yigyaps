import { z } from "zod";
import crypto from "node:crypto";

const nodeEnv = process.env.NODE_ENV || "development";
const isTest = nodeEnv === "test";

const envSchema = z.object({
  // Required but default to random for easy deployments
  // In test mode, accept TEST_DATABASE_URL as fallback
  DATABASE_URL:
    isTest && process.env.TEST_DATABASE_URL
      ? z.string().url().default(process.env.TEST_DATABASE_URL)
      : z.string().url(),
  SESSION_SECRET: z
    .string()
    .min(32)
    .default(() => crypto.randomBytes(32).toString("hex")),
  JWT_SECRET: z
    .string()
    .min(32)
    .default(() => crypto.randomBytes(32).toString("hex")),
  GITHUB_CLIENT_ID: z.string().min(1).default("UNCONFIGURED_GITHUB_CLIENT_ID"),
  GITHUB_CLIENT_SECRET: z
    .string()
    .min(1)
    .default("UNCONFIGURED_GITHUB_CLIENT_SECRET"),

  // Optional with defaults
  PORT: z.coerce.number().default(3100),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

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

  // LLM - Anthropic API key for Evolution Lab real inference
  ANTHROPIC_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errorMsg = JSON.stringify(parsed.error.format(), null, 2);
  if (nodeEnv === "test") {
    // In test mode, warn but provide defaults to allow test suites to continue
    console.warn(
      "⚠️ Test environment - some env vars may be missing:",
      errorMsg,
    );
  } else {
    // In production/development, fail immediately
    console.error("❌ Invalid environment variables:", errorMsg);
    process.exit(1);
  }
}

export const env = parsed.data || {
  // Fallback defaults for test mode when validation fails
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ||
    "postgresql://test:test@localhost:5432/yigyaps_test",
  SESSION_SECRET:
    process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex"),
  GITHUB_CLIENT_ID: "UNCONFIGURED_GITHUB_CLIENT_ID",
  GITHUB_CLIENT_SECRET: "UNCONFIGURED_GITHUB_CLIENT_SECRET",
  PORT: 3100,
  HOST: "0.0.0.0",
  LOG_LEVEL: "info" as const,
  NODE_ENV: "test" as const,
  CORS_ORIGIN: "",
  YIGYAPS_API_URL: undefined,
  GITHUB_CALLBACK_URL: undefined,
  FRONTEND_URL: "http://localhost:3000",
  DB_POOL_MAX: 20,
  DB_POOL_IDLE_TIMEOUT: 30000,
  DB_POOL_CONN_TIMEOUT: 10000,
  KMS_KEK: undefined,
  ANTHROPIC_API_KEY: undefined,
};
