#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Batch publish all 6 Yigfinance skills to YigYaps Registry
#
# Prerequisites:
#   1. yigyaps CLI installed and on PATH
#   2. Authenticated via: yigyaps login
#
# Usage:
#   ./scripts/publish-yigfinance.sh             # Dry run (preview)
#   ./scripts/publish-yigfinance.sh --publish   # Publish for real
#
# Source: https://github.com/Henghenggao/Yigfinance
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$REPO_ROOT/skills"

SKILLS=(
  "yigfinance-context-setup"
  "yigfinance-data-check"
  "yigfinance-variance-review"
  "yigfinance-forecast-review"
  "yigfinance-cfo-review"
  "yigfinance-management-pack"
)

DRY_RUN="--dry-run"
if [[ "${1:-}" == "--publish" ]]; then
  DRY_RUN=""
  echo "═══════════════════════════════════════════════════════════"
  echo "  PUBLISHING Yigfinance skills to YigYaps Registry"
  echo "═══════════════════════════════════════════════════════════"
else
  echo "═══════════════════════════════════════════════════════════"
  echo "  DRY RUN — Preview Yigfinance skill publishing"
  echo "  Pass --publish to publish for real"
  echo "═══════════════════════════════════════════════════════════"
fi

echo ""
echo "Skills to process: ${#SKILLS[@]}"
echo "Source: https://github.com/Henghenggao/Yigfinance"
echo ""

SUCCESS=0
FAILED=0

for skill in "${SKILLS[@]}"; do
  SKILL_DIR="$SKILLS_DIR/$skill"

  if [[ ! -d "$SKILL_DIR" ]]; then
    echo "  SKIP: $skill (directory not found)"
    ((FAILED++)) || true
    continue
  fi

  echo "──────────────────────────────────────────────────────────"
  echo "  Publishing: $skill"
  echo "──────────────────────────────────────────────────────────"

  pushd "$SKILL_DIR" > /dev/null

  if yigyaps publish $DRY_RUN; then
    ((SUCCESS++)) || true
    echo "  OK: $skill"
  else
    ((FAILED++)) || true
    echo "  FAIL: $skill"
  fi

  popd > /dev/null
  echo ""
done

echo "═══════════════════════════════════════════════════════════"
echo "  Done: $SUCCESS succeeded, $FAILED failed"
echo "═══════════════════════════════════════════════════════════"

if [[ $FAILED -gt 0 ]]; then
  exit 1
fi
