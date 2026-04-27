# M001 Roadmap: YAPs Platform Evolution

## Vision

Yigyaps becomes the publishing, assembly, governance, and distribution platform for YAPs: skills-pack plugin containers composed from one core pack plus configurable mounted extension packs.

Yigfinance is the first canonical YAP. ETO Professional Project Pack is the default mounted extension pack under Yigfinance, but pack mounting must remain data-driven so another extension pack can replace or supplement it without code changes.

## Success Criteria

- Yigfinance can be imported and represented as a full YAP, not as flattened legacy skill packages.
- Yigyaps can store and serve SkillPack Bridge artifacts.
- Users can mount and switch extension packs under a YAP through data/API/CLI/UI paths.
- The platform can return a merged YAP manifest/execution graph.
- Security and CI gates are reliable enough to support the migration.

## Slices

- [x] **S01: Fix Legacy Rules Security Boundary** `risk:high` `depends:[]`
  > After this: CLI/Web-published proprietary rules cannot be anonymously read through public rules endpoints.
- [x] **S02: Fix API Integration Test Gate** `risk:high` `depends:[]`
  > After this: API integration tests no longer fall back to drifted shared databases and schema setup is deterministic.
- [x] **S03: Introduce YAP First-Class Model** `risk:high` `depends:[S02]`
  > After this: API can create and read `yigfinance` as a YAP, distinct from a legacy skill package.
- [x] **S04: Store SkillPack Bridge Artifacts** `risk:high` `depends:[S03]`
  > After this: Yigyaps can persist `skillpack.json`, `routes.json`, `tool-map.json`, `feedback.json`, `update.json`, and schemas.
- [x] **S05: Import Yigfinance As First YAP** `risk:high` `depends:[S04]`
  > After this: importing from `C:/Users/gaoyu/Documents/GitHub/Yigfinance` yields a `yigfinance` YAP with all generated skills and artifacts.
- [x] **S06: Add Configurable Pack Mounts** `risk:high` `depends:[S05]`
  > After this: ETO Professional Project Pack can be mounted under `yigfinance`, and another pack can be switched in without code changes.
- [x] **S07: Resolve Merged YAP Manifest** `risk:high` `depends:[S06]`
  > After this: API returns a merged graph containing core pack plus mounted packs, including skills, routes, schemas, and tool mappings.
- [x] **S08: Validate Compatibility And Conflicts** `risk:medium` `depends:[S07]`
  > After this: mounting a pack reports contract-version, route, tool-map, and schema conflicts before activation.
- [x] **S09: Add CLI YAP And Pack Commands** `risk:medium` `depends:[S07]`
  > After this: CLI can import a YAP, publish a pack, mount a pack, and export merged artifacts.
- [x] **S10: Upgrade Web Assembly Experience** `risk:medium` `depends:[S07,S08]`
  > After this: Web shows a YAP's mounted packs, dependency graph, conflict status, and resolved artifacts.
- [x] **S11: Add Contract-Aware Runtime Planner Stub** `risk:medium` `depends:[S08]`
  > After this: given a YAP and a task, API can resolve candidate skills/routes without requiring full finance runtime execution.
- [x] **S12: End-To-End Yigfinance Plus ETO Demo** `risk:medium` `depends:[S09,S10,S11]`
  > After this: a user can publish Yigfinance, mount ETO Professional Project Pack, export the merged YAP, and inspect the resolver graph.

## Key Risks

- Legacy plaintext rules behavior can undermine the protected-knowledge product promise.
- Test database drift can hide migration failures.
- Flattening SkillPack artifacts into legacy packages would lose routes, schemas, feedback, and tool-map semantics.
- Hardcoding ETO as special product logic would block future extension pack switching.

## Proof Strategy

- Keep each slice end-to-end and demoable through API, CLI, or UI.
- Preserve Yigfinance generated artifacts verbatim where possible.
- Treat YAP assembly as data/configuration first, runtime execution second.
- Add compatibility checks before enabling mounted packs.

## Verification Classes

- Unit tests for parsers, validators, and resolver logic.
- Integration tests for API persistence and artifact retrieval.
- CLI tests for import/export/mount commands.
- Web tests for assembly state rendering.
- Build/lint/test gates for every slice.

## Definition Of Done

- The slice's observable demo line is satisfied.
- Relevant tests pass or a blocker is documented with command output.
- No proprietary rules are exposed through unauthenticated public surfaces.
- Mounted packs are represented through data/API state, not code constants.

## Requirement Coverage

- Publish Yigfinance directly as a YAP: S03, S04, S05.
- Mount ETO by default under Yigfinance: S06, S07, S12.
- Switch to other extension packs without code changes: S06, S08, S09, S10.
- Preserve Yigfinance architecture: S04, S05, S07.
- Stabilize current platform first: S01, S02.

## Horizontal Checklist

- [ ] DB migrations include rollback-safe additive changes where possible.
- [x] API types are exported through shared packages where clients need them.
- [x] CLI and Web use the same public API semantics.
- [ ] Artifact validation rejects malformed or incompatible SkillPacks.
- [x] Documentation explains YAP, Skill Pack, Skill, and Mounted Pack terms.

## Boundary Map

S01 produces: secure legacy rule access policy and tests. Consumes: existing `yy_skill_rules`, package license/status fields, CLI publish flow.

S02 produces: deterministic API test database setup. Consumes: Drizzle migrations, Vitest config, integration helpers.

S03 produces: YAP entity and CRUD surface. Consumes: existing package/user ownership patterns.

S04 produces: artifact persistence and retrieval APIs. Consumes: Yigfinance SkillPack Bridge artifact shapes.

S05 produces: Yigfinance import path. Consumes: artifacts stored by S04 and source repo at `C:/Users/gaoyu/Documents/GitHub/Yigfinance`.

S06 produces: mounted pack records with version pins and enabled state. Consumes: YAP and Skill Pack entities.

S07 produces: merged YAP manifest/resolver endpoint. Consumes: mounted pack records and artifact persistence.

S08 produces: compatibility/conflict reports. Consumes: merged manifest, routes, tool-map, schemas, and contract versions.

S09 produces: CLI commands for YAP and pack workflows. Consumes: APIs from S03 through S08.

S10 produces: Web assembly UI. Consumes: APIs from S03 through S08.

S11 produces: runtime planner stub. Consumes: merged YAP manifest and route artifacts.

S12 produces: integrated demo. Consumes: CLI, Web, resolver, and imported Yigfinance/ETO pack state.
