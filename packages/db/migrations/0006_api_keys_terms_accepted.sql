-- Migration 0006: Add terms_accepted_at to yy_api_keys
-- Required for Anti-Training EULA enforcement (Sprint 7A)

ALTER TABLE "yy_api_keys" ADD COLUMN IF NOT EXISTS "terms_accepted_at" bigint;
