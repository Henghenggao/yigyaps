# S12 Demo: Yigfinance Plus ETC

This demo proves the YAP model end to end: Yigfinance is published as the core YAP, ETC is published as a mountable extension Skill Pack, the extension is mounted through data, the merged assembly is exported, and the runtime planner can resolve candidate skills without executing the finance runtime.

## Inputs

- Yigfinance source repo: `C:/Users/gaoyu/Documents/GitHub/Yigfinance`
- ETC extension pack example: `examples/skill-packs/etc-professional-projects`
- Web assembly route: `http://127.0.0.1:5173/yaps/yigfinance/assembly`

## Preflight

```powershell
npm run build
node packages\cli\bin\yigyaps.js yap import C:\Users\gaoyu\Documents\GitHub\Yigfinance --dry-run --json
node packages\cli\bin\yigyaps.js yap pack publish yigfinance examples\skill-packs\etc-professional-projects --dry-run --json
```

Expected preflight signal:

- Yigfinance import plan reports one core Skill Pack named `yigfinance`.
- ETC publish plan reports one extension Skill Pack named `etc-professional-projects`.

## Publish And Mount

```powershell
node packages\cli\bin\yigyaps.js yap import C:\Users\gaoyu\Documents\GitHub\Yigfinance --json
node packages\cli\bin\yigyaps.js yap pack publish yigfinance examples\skill-packs\etc-professional-projects --json
node packages\cli\bin\yigyaps.js yap mount validate yigfinance <ETC_SKILL_PACK_ID> --mount-key etc --mount-point extensions/project --priority 20 --json
node packages\cli\bin\yigyaps.js yap mount add yigfinance <ETC_SKILL_PACK_ID> --mount-key etc --mount-point extensions/project --priority 20 --json
```

The mounted ETC pack is data-backed by the mount record. Replacing it with another extension pack is the same slot update:

```powershell
node packages\cli\bin\yigyaps.js yap mount switch yigfinance <MOUNT_ID> <REPLACEMENT_SKILL_PACK_ID> --mount-key etc --json
```

## Export And Inspect

```powershell
New-Item -ItemType Directory -Force .gsd\milestones\M001\artifacts | Out-Null
node packages\cli\bin\yigyaps.js yap assembly export yigfinance -o .gsd\milestones\M001\artifacts\yigfinance-assembly.json
node packages\cli\bin\yigyaps.js yap runtime plan yigfinance --task "Review ETC project margin risk and forecast-to-complete assumptions" --mount-keys etc --max-candidates 3 --json
```

Expected resolver signal:

- Assembly export includes `corePack.skillPack.name = "yigfinance"`.
- Assembly export includes mounted pack `etc-professional-projects` with `mount.mountKey = "etc"`.
- Runtime plan returns `etc-project-review` as a candidate for ETC project margin tasks.
- Web route shows the pack graph, mounted packs, conflict status, resolved skills, and artifact index.

## No-Code Switch Guarantee

The Yigfinance product code does not reference ETC directly. ETC is selected by data:

- `yy_skill_packs.pack_type = "extension"`
- `yy_yap_pack_mounts.mount_key = "etc"`
- `PATCH /v1/yaps/:yapId/mounts/:mountId` can swap `skillPackId`

That is the compatibility line for future professional project packs.
