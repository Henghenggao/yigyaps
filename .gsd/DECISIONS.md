# Architecture Decisions

## M001-S03: YAP API Contract

Scope: expose YAPs as first-class resources distinct from legacy single skill packages.

Endpoints:

- `POST /v1/yaps` creates a YAP. Auth: required Bearer JWT/API key. Response: `201` with `Location: /v1/yaps/<id>` and the created YAP row. Duplicate slug returns `409`.
- `GET /v1/yaps` lists public active YAPs with bounded offset pagination: `limit` max 100, `offset` default 0. `mine=true` requires auth and lists caller-owned YAPs.
- `GET /v1/yaps/:id` reads by internal ID.
- `GET /v1/yaps/by-slug/:slug` reads by stable product slug, for example `yigfinance`.

Auth model:

- Writes require `requireAuth()`.
- Reads use optional auth. Public and unlisted active YAPs are readable by direct request. Private YAPs are readable only by owner or admin.

Versioning:

- Path-versioned under `/v1`.
- Future changes should be additive: new optional fields and subresources for SkillPack artifacts and mounts.

Pagination:

- Offset pagination is acceptable for the first marketplace/admin surface because the list is small and bounded. Any future high-volume artifact or event listing should use cursors.

Error shape:

- S03 follows the existing Yigyaps route style: `{ error, message?, details? }`.
- A platform-wide machine-readable error envelope is deferred to a dedicated consistency pass.

Idempotency:

- `POST /v1/yaps` is not idempotent. Clients retrying creation should handle `409` by reading `GET /v1/yaps/by-slug/:slug`.

Extensibility:

- `assembly_config` is intentionally JSONB and data-driven. ETO can be the default extension pack for `yigfinance` through stored configuration/mount records, not hardcoded product logic.

## M001-S04: SkillPack Artifact API Contract

Scope: persist SkillPack Bridge outputs under a YAP without flattening them into legacy rules.

Endpoints:

- `POST /v1/yaps/:yapId/skill-packs` creates a Skill Pack and its artifacts. `yapId` may be the internal YAP ID or stable slug. Response: `201` with `Location: /v1/yaps/<yapId>/skill-packs/<packId>`. Duplicate `(yap, name, version)` returns `409`.
- `GET /v1/yaps/:yapId/skill-packs` lists Skill Packs under a readable YAP.
- `GET /v1/yaps/:yapId/skill-packs/:packId` reads one Skill Pack.
- `GET /v1/yaps/:yapId/skill-packs/:packId/artifacts` lists artifacts, optionally filtered by `artifactType`.
- `GET /v1/yaps/:yapId/skill-packs/:packId/artifacts/:artifactId` reads a single artifact.

Artifact model:

- The pack manifest is stored both on `yy_skill_packs.manifest` and as a canonical `skillpack` artifact at `skillpack.json`.
- Artifact types are: `skillpack`, `tool-map`, `routes`, `feedback`, `update`, `schema`, `command`, `skill-md`, and `other`.
- `content` is JSONB so Bridge JSON files and future text artifacts can share one storage path. `content_sha256` records a deterministic hash of the stored JSON value for integrity checks.

Auth model:

- Creating Skill Packs requires the YAP owner or admin.
- Reads follow YAP visibility: public/unlisted active YAPs are readable; private YAPs require owner/admin.

Versioning:

- The resource is under `/v1`.
- `(yap_id, name, version)` is immutable identity for a Skill Pack version. Later updates should publish a new version rather than mutate the original artifact set, except for explicit admin repair flows.

Path safety:

- Artifact paths are logical relative paths, not filesystem paths. The API rejects absolute paths, null bytes, and traversal segments.

## M001-S05: Yigfinance Import Contract

Scope: import the existing Yigfinance generated Bridge output as the first canonical YAP without flattening its skills into legacy packages.

CLI:

- `yigyaps yap import <sourceDir>` reads a Yigfinance-style repository and publishes one YAP plus one core Skill Pack.
- Defaults assume the current Yigfinance layout:
  - Bridge plugin artifacts: `generated/yigthinker/.yigthinker-plugin`
  - command markdown: `generated/yigthinker/commands`
  - generated skills: `generated/claude/skills`
- `--dry-run --json` produces an import plan without authentication or network calls.
- `--plugin-dir`, `--commands-dir`, and `--skills-dir` keep the importer layout-driven rather than hardcoded to a single repository copy.

Mapping:

- `skillpack.json` becomes both `yy_skill_packs.manifest` and the API-created canonical `skillpack` artifact.
- `routes.json`, `tool-map.json`, `feedback.json`, and `update.json` keep their dedicated artifact types.
- `schemas/*.json`, command markdown, generated `SKILL.md` files, and hooks are preserved as artifacts under logical relative paths.
- The imported Skill Pack is `packType=core`, `source=imported`, and uses the Bridge `contract_version`.

Idempotency:

- If the YAP slug already exists, the CLI reads it back and reuses it.
- If the same Skill Pack name/version already exists under that YAP, the CLI reports the existing pack rather than requiring a code change or manual cleanup.

Assembly:

- The YAP `assemblyConfig` records the core pack and an empty `mountedPacks` list.
- ETO and future extension packs must be added through mount records in S06, not through Yigfinance-specific code constants.

## M001-S06: Configurable Pack Mounts API Contract

Scope: represent extension packs mounted under a YAP as mutable data records so ETO can be the default Yigfinance extension without becoming hardcoded product logic.

Endpoints:

- `POST /v1/yaps/:yapId/mounts` creates a mount slot pointing at an extension Skill Pack. Request: `{ skillPackId, mountKey, mountPoint?, displayName?, priority?, enabled?, required?, config?, constraints? }`. Response: `201` with `{ mount, skillPack }` and `Location: /v1/yaps/<yapId>/mounts/<mountId>`.
- `GET /v1/yaps/:yapId/mounts` lists mounts for a readable YAP. Query: `enabled?`, `limit` max 100, `offset`. Response: `{ mounts, total, limit, offset }`, where each item contains `{ mount, skillPack }`.
- `GET /v1/yaps/:yapId/mounts/:mountId` reads one mount and its current Skill Pack.
- `PATCH /v1/yaps/:yapId/mounts/:mountId` updates mount metadata or switches the slot to another extension Skill Pack through `skillPackId`.
- `DELETE /v1/yaps/:yapId/mounts/:mountId` removes the mount. Response: `204`.

Auth:

- Writes require the YAP owner or admin.
- Reads follow YAP visibility: public/unlisted active YAPs are readable; private YAPs require owner/admin.

Validation:

- Mounted packs must belong to the same YAP, must have `packType=extension`, and must not be archived.
- `(yap_id, mount_key)` is unique. A stable mount key such as `default-project-pack` lets clients switch ETO to another pack with a PATCH, not a code change.

Versioning:

- The API remains under `/v1`.
- Future fields should be additive. Conflict validation and merged manifest resolution are deferred to S08/S07 respectively.

Pagination:

- Offset pagination is acceptable for mount lists because mount counts are bounded per YAP. The API enforces `limit <= 100`.

## M001-S07: Resolved YAP Assembly API Contract

Scope: expose a read model for a YAP assembled from one core Skill Pack plus enabled mounted extension packs.

Endpoint:

- `GET /v1/yaps/:yapId/assembly` resolves a YAP by internal ID or stable slug.
- Query: `maxMounts` defaults to 50 and is capped at 100.
- Response: `200` with `{ yap, corePack, mountedPacks, merged, diagnostics, generatedAt }`.

Merged read model:

- `corePack` contains the selected core Skill Pack and its resolver-relevant artifacts.
- `mountedPacks` contains enabled mount records and their Skill Packs ordered by mount priority and key.
- `merged.skills` is built from each pack manifest's `skills` array and records the source pack/mount for each skill.
- `merged.routes.skills`, `merged.toolMap.mappings`, and `merged.schemas` merge resolver artifacts in pack order.
- `merged.artifactIndex` lists all artifact IDs, paths, hashes, media types, and source pack/mount metadata without inlining command or SKILL.md bodies.

Selection:

- The core pack is selected from `yap.assemblyConfig.corePack.name/version` when present, otherwise the first active core pack under the YAP.
- Only enabled mounts are included in S07 resolution.

Conflict posture:

- S07 reports duplicate skill, route, tool-map, and schema keys in `diagnostics.conflicts` but does not block resolution.
- S08 will turn these diagnostics into pre-activation compatibility/conflict validation.

Auth and caching:

- Reads follow YAP visibility: public/unlisted active YAPs are readable; private YAPs require owner/admin.
- Responses use `Cache-Control: no-store` until stable ETags are introduced for assembly revisions.

Errors:

- `404` when the YAP is missing or not readable.
- `409` when no core Skill Pack can be selected or the YAP has more enabled mounts than `maxMounts`.

Versioning:

- The endpoint is path-versioned under `/v1`.
- Future response additions should be additive; breaking resolver semantics require a new endpoint version or explicit response version field.

## M001-S08: Mount Compatibility And Conflict Validation

Scope: validate extension Skill Packs before they become active parts of a YAP assembly.

Endpoint:

- `POST /v1/yaps/:yapId/mount-validations` validates a candidate mount without mutating state.
- Request: `{ skillPackId, mountKey, replacingMountId?, mountPoint?, displayName?, priority?, enabled?, required?, config?, constraints? }`.
- Response: `200` with `{ status, issues, candidate, summary, generatedAt }`.
- `status` is `pass`, `warning`, or `blocked`.

Activation enforcement:

- `POST /v1/yaps/:yapId/mounts` validates when `enabled=true` and returns `409` with `{ error: "Mount validation failed", validation }` when blocked.
- `PATCH /v1/yaps/:yapId/mounts/:mountId` validates the target state when the result would be enabled. Switching ETO to another project pack is therefore checked before activation.
- Draft mounts can still be stored with `enabled=false`; they are excluded from assembly resolution until enabled.

Blocking issues:

- Missing core Skill Pack.
- Candidate/core `contractVersion` mismatch.
- Duplicate skill names.
- Duplicate route graph keys.
- Duplicate tool-map keys.
- Duplicate schema artifact paths.

Auth:

- Validation is write-scoped because it can reveal private pack structure. It requires the YAP owner or admin.

Compatibility posture:

- S08 blocks known structural conflicts. More nuanced semantic compatibility, such as version ranges or route override policies, should be additive fields on validation issues rather than a replacement response shape.

## M001-S09: CLI YAP And Pack Workflow Contract

Scope: expose the YAP assembly workflow through CLI commands so Yigfinance can be published as the first canonical YAP and ETO or another extension pack can be mounted and switched without code changes.

Commands:

- `yigyaps yap import <sourceDir>` remains the Yigfinance-first importer. It creates or reuses the YAP, then creates or reuses the core Skill Pack.
- `yigyaps yap pack publish <yap> <sourceDir>` publishes a generic SkillPack Bridge directory or repository root under an existing YAP. It defaults to `packType=extension`, while `--pack-type core` remains available for future canonical YAP imports.
- `yigyaps yap mount validate <yap> <skillPackId> --mount-key <key>` calls the same validation surface used by the API before activation.
- `yigyaps yap mount add <yap> <skillPackId> --mount-key <key>` creates a data-backed mount slot.
- `yigyaps yap mount switch <yap> <mountId> <skillPackId>` PATCHes an existing slot to a replacement Skill Pack, preserving the no-code extension swap model.
- `yigyaps yap assembly export <yap> [-o file]` exports the resolved YAP assembly JSON for runtime adapters, demos, and debugging.

Artifact import model:

- Generic pack publishing reads `skillpack.json` either from `sourceDir` or from the Yigfinance-style nested Bridge plugin directory.
- Optional Bridge artifacts are preserved as typed artifacts: `plugin.json`, `routes.json`, `tool-map.json`, `feedback.json`, `update.json`, `schemas/*.json`, command markdown, and generated `SKILL.md` files.
- The Yigfinance-specific layout defaults stay isolated to `yap import`; extension pack publishing can point at different directories with `--commands-dir` and `--skills-dir`.

Auth:

- Dry-run planning does not require authentication.
- Publishing and mount mutations require authenticated publisher credentials.
- Assembly export uses the registry read client and follows the API visibility model.

Operational posture:

- ETO is represented as an extension Skill Pack mounted under `yigfinance` through CLI/API data. Replacing ETO with another project pack is a `yap mount switch` operation, not a product-code change.

## M001-S10: Web Assembly Experience

Scope: add a read-only Web workbench for inspecting a resolved YAP assembly.

Route:

- `/yaps/:yapId` and `/yaps/:yapId/assembly` render the same assembly view.
- The header links to `/yaps/yigfinance/assembly` because Yigfinance is the first canonical YAP.

Data contract:

- The page reads `GET /v1/yaps/:yapId/assembly` through the shared `fetchApi` helper.
- It uses the same `ResolvedYapManifest` type consumed by CLI export, so Web and CLI inspect the same resolver output.
- Reads remain unauthenticated unless the API visibility policy requires a session.

Experience:

- The first viewport is an operational workbench: YAP identity, pack/skill/route/tool/schema counts, pack graph, mounted packs, conflict status, resolved skills, and artifact index.
- Mounted packs display the stable `mountKey`, source pack, priority, and enabled state. This keeps the ETO default visible as data and makes future pack replacement understandable without product-code branching.
- Conflict status uses `diagnostics.conflicts` from assembly resolution. S10 does not introduce separate Web-only conflict rules.
- Resolved artifacts are filterable by artifact type using the artifact index returned by the resolver.

Implementation posture:

- The page is lazy-loaded to keep the main bundle path aligned with existing route-splitting.
- The hook is intentionally read-only. Mutating mount state remains in CLI/API for S09/S06; an editable Web mount manager can be a later slice.

## M001-S11: Contract-Aware Runtime Planner Stub

Scope: expose a non-executing planner that maps a task to candidate skills/routes/tools from a resolved YAP assembly.

Endpoint:

- `POST /v1/yaps/:yapId/runtime-plans` creates an ephemeral runtime plan. It does not persist state and does not execute any finance/runtime code.
- Query: `maxMounts` defaults to 50 and is capped at 100, matching assembly resolution.
- Request body: `{ task, requiredSkills?, expectedContractVersion?, maxCandidates?, hints? }`.
- `hints` may include `skillNames`, `mountKeys`, `routeKeys`, and `toolKeys`.
- Response: `{ yap, task, status, candidates, diagnostics, generatedAt }`.

Planner semantics:

- `status=ready` when candidates are available and no planner issues are present.
- `status=degraded` when candidates are available but assembly conflicts, missing route entries, missing tool mappings, or no exact match reduce confidence.
- `status=blocked` when the requested contract version mismatches or a required skill is absent.
- Candidate records include the resolved skill, source pack/mount, route entry, tool-map matches, schema keys, score, and reasons.

Auth and visibility:

- Reads use the same visibility rules as `GET /v1/yaps/:yapId/assembly`: public/unlisted active YAPs are readable, private YAPs require owner/admin.
- The route uses `POST` because task text and hints can exceed practical query string size and may become sensitive; it remains non-mutating and returns `Cache-Control: no-store`.

Error model:

- `400` for invalid request shape.
- `404` when the YAP is missing or not readable.
- `409` when assembly cannot be resolved, such as missing core Skill Pack or too many enabled mounts.
- Domain-level planning limitations are returned as `diagnostics.issues`, not protocol errors, unless they prevent assembly resolution.

Versioning:

- The endpoint is path-versioned under `/v1`.
- Future runtime execution should be a separate operation; this planner response should evolve additively so CLI/Web/runtime adapters can keep inspecting candidate resolution.

## M001-S12: Yigfinance Plus ETO End-To-End Demo

Scope: close M001 with a runnable product proof that Yigfinance can be represented as a first-class YAP and ETO can be mounted as a default extension Skill Pack without product-code coupling.

Demo assets:

- Repo-local ETO extension pack fixture: `examples/skill-packs/eto-professional-projects`.
- Demo runbook: `.gsd/milestones/M001/S12-YIGFINANCE-ETO-DEMO.md`.
- CLI runtime planner inspection command: `yigyaps yap runtime plan <yap> --task <text>`.

Demo flow:

- Dry-run import from `C:/Users/gaoyu/Documents/GitHub/Yigfinance` verifies the canonical Yigfinance core pack can be discovered from the existing Bridge layout.
- Dry-run publish of `examples/skill-packs/eto-professional-projects` verifies an extension pack can be read from a generic SkillPack Bridge directory.
- Live publish creates or reuses the `yigfinance` YAP and publishes ETO as an extension Skill Pack.
- `yap mount validate` and `yap mount add` attach ETO through a stable mount slot.
- `yap assembly export` emits the merged core-plus-extension graph.
- `yap runtime plan` inspects the resolver graph and returns candidate skills/routes/tools for a task, without executing the finance runtime.
- `/yaps/yigfinance/assembly` exposes the same resolved assembly through the Web workbench.

No-code switch guarantee:

- ETO is selected by data records, not by Yigfinance-specific product constants.
- The stable mount slot is `mountKey=eto`; replacing the default professional project pack is a `PATCH /v1/yaps/:yapId/mounts/:mountId` or `yigyaps yap mount switch` operation.
- Future extension packs only need compatible SkillPack Bridge artifacts and passing mount validation.

Boundary:

- S12 proves assembly, compatibility, export, and planning. It does not execute Yigfinance finance calculations or ETO project analysis; runtime execution should remain a later milestone layered on top of the planner contract.

## M001-H01: Release Gate Hardening After S12

Scope: tighten the release-readiness surface discovered while preparing M001 for handoff.

Test gate:

- API and DB Vitest configs set `root` to their package directories so monorepo workspace invocations and explicit config invocations resolve the same package-local test tree.
- API and DB test include globs use `**/__tests__/**/*.test.ts` to avoid cwd-specific discovery ambiguity.
- API test files run with `fileParallelism=false` because the integration suite uses one migrated PostgreSQL Testcontainers database and several files intentionally truncate shared tables. Running those files concurrently creates deadlocks and fixture collisions.
- DB global setup now matches the API posture: use `TEST_DATABASE_URL` when explicitly provided; otherwise start an isolated PostgreSQL Testcontainers instance. It does not fall back to `DATABASE_URL`.
- DB global setup no longer writes `.test-db-env.json`; test database state stays in process environment and container lifecycle only.

Artifact safety:

- Skill Pack artifact paths reject POSIX absolute paths, Windows drive absolute paths, UNC-style paths, null bytes, and traversal segments before normalization.
- This keeps SkillPack artifacts as logical relative paths and avoids platform-specific path ambiguity in API storage.

Known local blocker:

- On this workstation, API/DB integration gates still stop before execution because Testcontainers cannot find a working container runtime strategy. That is an environment/runtime blocker, not a shared-database fallback.

## M002-S01: Remote Host Manifest For YAP Products

Scope: start productizing Yigfinance + ETO as a remotely callable YAP by giving hosts a compact discovery and integrity contract before they pull the full assembly.

API shape:

- `GET /v1/yaps/:yapId/remote-manifest` returns `schemaVersion=yigyaps.remote-manifest.v1`.
- Query parameters: `host`, `hostVersion`, `mountKeys`, and `maxMounts`.
- The route is idempotent and cacheable for public YAPs. It returns an `ETag` based on a stable manifest hash and honors `If-None-Match` with `304`.
- It filters enabled mounts by requested `mountKeys`; unknown mount keys return `422`.

Remote host contract:

- `product` identifies the YAP product.
- `host.compatibility` reports whether each pack declares compatibility with the requested host, without pretending to solve semantic versioning yet.
- `remote.endpoints` links to full assembly and runtime-plan endpoints.
- `assembly` provides stable counts and pack summaries for preflight checks.
- `artifacts.index` exposes artifact paths and hashes while keeping artifact bodies in the full assembly pull path.

Rationale:

- Yigthinker and Yigcore-addins should not need to download large artifact bodies just to decide whether a YAP is compatible and mounted correctly.
- Hosted execution remains a later milestone; the first remote-callable layer should make discovery, cache validation, mount selection, and runtime planning dependable.

## M002-S02: SDK Host Runtime Handoff

Scope: give Yigthinker and Yigcore-addins a single SDK entry point for consuming remote YAP products such as Yigfinance plus its mounted ETO project pack.

Client shape:

- `prepareYapHostRuntime(client, options)` composes `getYapRemoteManifest`, `planYapRuntime`, and `getYapAssembly`.
- `options.host` identifies the target host, currently `yigthinker` or `yigcore-addins`.
- `options.mountKeys` lets the caller select the data-backed extension slot, for example `eto`, without changing Yigfinance product code.
- The returned handoff includes the compact manifest, runtime plan, selected candidate, artifact hash index, selected candidate artifacts, endpoint links, and optionally the full resolved assembly.

Execution boundary:

- The SDK still returns `mode=local-plan`; it does not run finance or project-analysis code.
- Remote hosts remain responsible for local execution, permissioning, and UI/runtime integration.
- The handoff is intentionally structural so different hosts can use the same YAP product contract while mapping execution into their own plugin/add-in lifecycle.

Rationale:

- Yigfinance plus ETO needs to be callable by host products before Yigyaps owns hosted execution.
- Keeping the first SDK layer as discovery plus planning avoids prematurely coupling platform API code to Yigthinker or Office add-in runtime details.

## M002-S03: CLI Remote Host Prepare Smoke Path

Scope: expose the SDK host handoff through the CLI so product/runtime integration can be verified without writing a Yigthinker or Office add-in adapter first.

Command:

- `yigyaps yap host prepare <yap>` prepares a remote host handoff.
- Required options are `--host` and `--task`.
- Optional `--host-version`, `--mount-keys`, `--required-skills`, `--expected-contract-version`, `--max-candidates`, and `--max-mounts` map directly to the SDK handoff inputs.
- `--no-assembly` skips the full assembly pull when a host only needs discovery plus planning.
- `--output` writes the full handoff JSON; `--json` prints it to stdout for scripts.

Rationale:

- This gives Yigfinance plus ETO a repeatable smoke command before host runtime code lands.
- The command exercises the same route chain expected by Yigthinker and Yigcore-addins: remote manifest, runtime plan, and optional assembly pull.
- It keeps no-code extension switching visible because `--mount-keys eto` selects the mounted pack data slot rather than a product constant.
