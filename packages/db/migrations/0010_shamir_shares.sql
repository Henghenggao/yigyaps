-- Migration 0010: Shamir Secret Sharing table
-- Stores (2,3) threshold shares for DEK protection.
-- Share 1 = platform, Share 2 = expert (returned to client), Share 3 = backup.

CREATE TABLE IF NOT EXISTS yy_shamir_shares (
  id              TEXT PRIMARY KEY,
  skill_package_id TEXT NOT NULL REFERENCES yy_skill_packages(id) ON DELETE CASCADE,
  share_index     INT NOT NULL CHECK (share_index BETWEEN 1 AND 3),
  share_data      TEXT NOT NULL,
  custodian       TEXT NOT NULL CHECK (custodian IN ('platform','expert','backup')),
  created_at      BIGINT NOT NULL,
  UNIQUE(skill_package_id, share_index)
);

CREATE INDEX IF NOT EXISTS idx_yy_shamir_shares_package ON yy_shamir_shares(skill_package_id);
