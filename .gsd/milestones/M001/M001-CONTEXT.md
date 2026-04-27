# M001: YAPs Platform Evolution

## Objective

Evolve Yigyaps from a single-skill marketplace into a YAPs publishing and assembly platform.

A YAP is a publishable, installable, and runnable skills-pack plugin container. Yigfinance is the first canonical YAP. Skill packs can be mounted into a YAP without code changes, with ETO Professional Project Pack as the default extension pack mounted under Yigfinance for the initial product path.

## Product Model

- YAP: top-level product container, for example `yigfinance`.
- Skill Pack: mountable module pack, for example `yigfinance-core` or `eto-professional-project-pack`.
- Skill: a concrete contract inside a pack, for example `variance-review` or `project-margin-review`.
- Mounted Pack: a version-pinned pack attachment to a YAP, enabled or disabled through data/configuration rather than code changes.

## Reference Architecture

Yigfinance is the reference implementation. Its generated Yigthinker plugin includes:

- `skillpack.json`
- `tool-map.json`
- `routes.json`
- `feedback.json`
- `update.json`
- `schemas/*.schema.json`
- 28 skills in the current generated pack

Yigyaps should preserve those artifacts as first-class publishable assets instead of flattening Yigfinance into a handful of legacy rules-only packages.

## Scope

In scope:

- Fix current security and test-gate blockers before adding the new model.
- Add YAP, Skill Pack, mounted pack, and artifact concepts.
- Import Yigfinance as the first full YAP.
- Support default ETO pack mounting under Yigfinance.
- Keep the mount system data-driven so other extension packs can be swapped in without code changes.
- Add conflict/compatibility validation and merged manifest/resolver APIs.

Out of scope for the first milestone:

- Full finance runtime execution parity.
- Rewriting Yigfinance internals.
- Hardcoding ETO-specific runtime behavior in Yigyaps.

## First Execution Wave

Start with:

- S01: Fix legacy rules security boundary.
- S02: Fix API integration test gate.

These retire the most immediate platform risks before the YAP model is added.
