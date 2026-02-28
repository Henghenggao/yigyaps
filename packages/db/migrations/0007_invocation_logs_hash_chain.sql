-- Migration 0007: Add hash-chain columns to yy_invocation_logs
-- Enables tamper-evident audit log verification (Sprint 7A)
--
-- prev_hash  = event_hash of previous log entry for same skill ("GENESIS" for first)
-- event_hash = SHA-256(skill_package_id + api_client_id + conclusion_hash + prev_hash)
-- Verifiable via GET /v1/admin/audit-verify/:skillId

ALTER TABLE "yy_invocation_logs" ADD COLUMN IF NOT EXISTS "prev_hash" text;
ALTER TABLE "yy_invocation_logs" ADD COLUMN IF NOT EXISTS "event_hash" text;
