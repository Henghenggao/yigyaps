-- Migration 0013: Add terms_accepted_at to yy_users
-- Records when the user accepted the platform Terms of Service.

ALTER TABLE "yy_users" ADD COLUMN IF NOT EXISTS "terms_accepted_at" bigint;
