# Release Readiness: Security and CI Hardening

Date: 2026-05-16

Audience: maintainers, reviewers, launch owner, and future operators.

Decision needed: whether this hardening batch is ready to merge, promote to staging, and prepare for alpha users.

## Release Goal

This release moves YigYaps from a demonstrator of protected skills toward a platform that can credibly protect creator IP during publishing and invocation.

The product promise is simple: creators can package expertise into agent-callable skills, while the platform returns useful conclusions to buyers without exposing the creator's raw rules or corpus. This batch strengthens that promise in code, tests, CI, and release operations.

## What Changed

### 1. Creator IP Custody

- New protected knowledge records use envelope encryption with Shamir key splitting.
- The platform stores only its share of the wrapped DEK.
- The creator receives an expert share during publish and must keep it outside the platform.
- KEK-based recovery remains available only for legacy records that predate Shamir metadata.
- Decrypted rule and corpus material is kept ephemeral during invocation.

### 2. Publish UX For Expert Share

- The web publish flow now surfaces the one-time expert share after a successful protected publish.
- Navigation away from the publish flow is blocked until the creator confirms they saved the expert share.
- The current browser session still keeps a temporary copy so the immediate post-publish path is usable, but durable custody belongs to the creator.

### 3. Runtime Access Control

- Protected rule and corpus invocation requires the correct expert share for Shamir-backed records.
- Missing or invalid expert shares produce explicit client errors instead of silent recovery.
- Failed recovery attempts are written to audit logs and feed the existing anti-abuse rate limit.

### 4. Package Identity Contract

- Public hyphenated package IDs are treated as public package IDs.
- Internal IDs are recognized only when they match the internal ID formats.
- SDK route selection now avoids confusing public slugs with private database IDs.

### 5. CI And Release Gates

- The project standardizes on Node 22 through local and CI configuration.
- The root unit test gate now includes the client package.
- Docker build paths for API and web have been verified.
- Production dependency audit is clean.
- The remaining audit finding is dev-only and comes from the Drizzle CLI dependency chain.

## Operational Behavior Changes

- Protected publish has a new critical secret handoff: the expert share.
- Losing the expert share means new Shamir-protected content cannot be recovered through normal invocation paths.
- Repeated missing or invalid expert-share attempts can now return rate-limit responses.
- Legacy encrypted records still depend on the legacy KEK path until migrated.
- External clients should pass public package IDs unless they intentionally have an internal ID.

## Verification Evidence

Fresh verification performed for this hardening batch:

- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:ci`: passed across API unit, API integration, DB integration, CLI, client, and web tests.
- `npm audit --omit=dev --json`: zero production vulnerabilities.
- `docker compose config --quiet`: passed.
- API Docker image build: passed.
- Web Docker image build: passed.
- Targeted publish UX test: passed.
- Targeted client route-selection tests: passed.
- Targeted Shamir recovery audit and rate-limit tests: passed.

Known audit item:

- `npm audit --json` reports four moderate dev-only findings from the Drizzle CLI dependency chain through an old esbuild range.
- The suggested automated fix downgrades `drizzle-kit`, so it should not be force-applied.
- Treat this as a dev-tooling dependency follow-up, not as a blocker for production runtime.

## Go / No-Go Checklist

Before promoting to staging:

- [ ] Re-run the full release gate after the final rebase.
- [ ] Confirm staging has production-like GitHub OAuth, JWT, session, CORS, database, and KMS settings.
- [ ] Publish one protected skill through the web UI and save the expert share.
- [ ] Invoke protected rules and corpus with the saved expert share.
- [ ] Confirm missing and invalid expert-share attempts are visible in audit logs.
- [ ] Confirm repeated failed attempts are rate-limited.
- [ ] Install a package by public hyphenated package ID through SDK or CLI.
- [ ] Take a database backup before any production promotion.
- [ ] Confirm support copy for creators explains that the expert share is not recoverable by the platform.

Before opening to alpha users:

- [ ] Add creator-facing backup guidance for the expert share.
- [ ] Decide whether to offer a downloadable expert-share file, passphrase-protected export, or both.
- [ ] Add basic alerting for repeated blocked DEK recovery attempts.
- [ ] Document legacy encrypted-record migration policy.
- [ ] Revisit the dev-only Drizzle audit item after checking current compatible releases.

## Residual Risks

### Expert Share Loss

The strongest security property also creates product risk: if a creator loses the expert share, the platform should not be able to silently recover the protected content. This is correct for trust, but the UX needs backup education and a deliberate recovery story.

Recommended next step: add an expert-share backup artifact and creator-facing copy before broader launch.

### Server-Side Trust Boundary

This release hardens encryption, recovery, and leakage controls, but it does not make the runtime fully zero-knowledge. The API still decrypts material in memory for invocation.

Recommended next step: keep positioning this as practical V1 IP protection, while treating TEE or external verifier work as the longer-term trust upgrade.

### Audit Log Scale

Failed recovery attempts now feed the existing audit log and rate-limit path. That is the right V1 reuse, but production scale needs retention, indexes, and alert thresholds.

Recommended next step: add operational metrics for blocked DEK recovery events.

### Legacy Records

Legacy encrypted records still use KEK recovery when Shamir metadata is absent.

Recommended next step: define a migration plan that re-wraps legacy records into Shamir-backed custody when creators next edit or republish.

## Recommended PR Split

Keep the branch reviewable by splitting the work into these logical commits or PR sections:

1. Security core: Shamir policy, leakage guard, protected invocation, audit logging, and related API tests.
2. Creator publish UX: expert-share save dialog and web regression test.
3. Package identity: package ID helpers, SDK route selection, CLI/API alignment, and tests.
4. CI and runtime gates: Node 22, Docker builds, workflow hardening, integration-test reliability.
5. Documentation: README, architecture notes, and this release-readiness page.

If this becomes more than one PR, land security core and package identity together before the creator UX changes. The UI should not promise a custody model the backend cannot enforce.

## PR Summary Draft

Use this as the PR body starting point:

```markdown
## Summary

- Adds Shamir split-key custody for newly protected skill knowledge.
- Requires and validates creator expert shares for protected invocation paths.
- Audits and rate-limits failed DEK recovery attempts.
- Fixes package ID route selection so public hyphenated package IDs stay public.
- Updates publish UX so creators must save the one-time expert share before leaving the flow.
- Hardens CI, Node, Docker, and test gates for release readiness.

## Verification

- npm run lint
- npm run build
- npm run test:ci
- npm audit --omit=dev --json
- docker compose config --quiet
- API Docker image build
- Web Docker image build

## Rollout Notes

- New protected records require the creator expert share for normal recovery and invocation.
- Legacy encrypted records still use KEK recovery until migrated.
- Production audit is clean; dev audit still reports the known Drizzle CLI dependency-chain finding.
- Staging smoke should publish and invoke one protected skill with a saved expert share.

## Residual Risk

- Expert-share loss is unrecoverable by design for new Shamir-backed protected content.
- Runtime is hardened V1 server-side protection, not a fully zero-knowledge or trustless execution model.
- Alerting and retention for blocked DEK recovery attempts should be added before broader launch.
```

## External Positioning

Use careful language:

- Good: "YigYaps gives creators practical V1 IP protection with encrypted storage, split-key custody, auditable invocation, and rate-limited abuse attempts."
- Good: "Creators keep an expert share, so the platform cannot casually recover protected knowledge without their participation."
- Avoid: "zero-knowledge", "impossible to leak", or "fully trustless" for this release.

## Next Execution Plan

1. Clean up the branch into the recommended PR split.
2. Re-run the full release gate after the split.
3. Promote to staging and execute the protected publish/invoke smoke test.
4. Add creator-facing expert-share backup UX.
5. Add blocked recovery alerting and retention policy.
6. Resolve or formally waive the dev-only Drizzle audit finding.
