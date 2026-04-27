# S12 Demo: Yigfinance Plus ETO

This demo proves the YAP model end to end: Yigfinance is published as the core YAP, ETO is published as a mountable extension Skill Pack, the extension is mounted through data, the merged assembly is exported, and the runtime planner can resolve candidate skills without executing the finance runtime.

## Inputs

- Yigfinance source repo: `C:/Users/gaoyu/Documents/GitHub/Yigfinance`
- ETO extension pack example: `examples/skill-packs/eto-professional-projects`
- Web assembly route: `http://127.0.0.1:5173/yaps/yigfinance/assembly`

## Preflight

```powershell
npm run build
node packages\cli\bin\yigyaps.js yap import C:\Users\gaoyu\Documents\GitHub\Yigfinance --dry-run --json
node packages\cli\bin\yigyaps.js yap pack publish yigfinance examples\skill-packs\eto-professional-projects --dry-run --json
```

Expected preflight signal:

- Yigfinance import plan reports one core Skill Pack named `yigfinance`.
- ETO publish plan reports one extension Skill Pack named `eto-professional-projects`.

## Publish And Mount

```powershell
node packages\cli\bin\yigyaps.js yap import C:\Users\gaoyu\Documents\GitHub\Yigfinance --json
node packages\cli\bin\yigyaps.js yap pack publish yigfinance examples\skill-packs\eto-professional-projects --json
node packages\cli\bin\yigyaps.js yap mount validate yigfinance <ETO_SKILL_PACK_ID> --mount-key eto --mount-point extensions/project --priority 20 --json
node packages\cli\bin\yigyaps.js yap mount add yigfinance <ETO_SKILL_PACK_ID> --mount-key eto --mount-point extensions/project --priority 20 --json
```

The mounted ETO pack is data-backed by the mount record. Replacing it with another extension pack is the same slot update:

```powershell
node packages\cli\bin\yigyaps.js yap mount switch yigfinance <MOUNT_ID> <REPLACEMENT_SKILL_PACK_ID> --mount-key eto --json
```

## Export And Inspect

```powershell
New-Item -ItemType Directory -Force .gsd\milestones\M001\artifacts | Out-Null
node packages\cli\bin\yigyaps.js yap assembly export yigfinance -o .gsd\milestones\M001\artifacts\yigfinance-assembly.json
node packages\cli\bin\yigyaps.js yap runtime plan yigfinance --task "Review ETO project margin risk and forecast-to-complete assumptions" --mount-keys eto --max-candidates 3 --json
```

Expected resolver signal:

- Assembly export includes `corePack.skillPack.name = "yigfinance"`.
- Assembly export includes mounted pack `eto-professional-projects` with `mount.mountKey = "eto"`.
- Runtime plan returns `eto-project-review` as a candidate for ETO project margin tasks.
- Web route shows the pack graph, mounted packs, conflict status, resolved skills, and artifact index.

## No-Code Switch Guarantee

The Yigfinance product code does not reference ETO directly. ETO is selected by data:

- `yy_skill_packs.pack_type = "extension"`
- `yy_yap_pack_mounts.mount_key = "eto"`
- `PATCH /v1/yaps/:yapId/mounts/:mountId` can swap `skillPackId`

That is the compatibility line for future professional project packs.
