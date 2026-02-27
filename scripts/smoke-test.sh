#!/usr/bin/env bash
# YigYaps Smoke Test — validates the API is healthy and core routes respond
# Usage: API_URL=https://api.yigyaps.com ./scripts/smoke-test.sh
#        API_URL=http://localhost:3100 ./scripts/smoke-test.sh

set -euo pipefail

API_URL="${API_URL:-http://localhost:3100}"
PASS=0
FAIL=0

green() { echo -e "\033[32m✓ $1\033[0m"; }
red()   { echo -e "\033[31m✗ $1\033[0m"; }
title() { echo -e "\n\033[1m$1\033[0m"; }

check() {
  local desc="$1"
  local expected_status="$2"
  local method="${3:-GET}"
  local path="$4"
  local body="${5:-}"

  local curl_args=(-s -o /dev/null -w "%{http_code}" -X "$method" \
    -H "Content-Type: application/json" \
    "${API_URL}${path}")

  if [[ -n "$body" ]]; then
    curl_args+=(-d "$body")
  fi

  local actual_status
  actual_status=$(curl "${curl_args[@]}")

  if [[ "$actual_status" == "$expected_status" ]]; then
    green "$desc (HTTP $actual_status)"
    ((PASS++))
  else
    red "$desc — expected $expected_status, got $actual_status"
    ((FAIL++))
  fi
}

# ── Health ────────────────────────────────────────────────────────────────────
title "Health Checks"
check "GET /v1/health returns 200"     "200" "GET" "/v1/health"
check "GET /.well-known/mcp.json"      "200" "GET" "/.well-known/mcp.json"

# ── Packages (Public) ─────────────────────────────────────────────────────────
title "Packages API (Public)"
check "GET /v1/packages returns 200"   "200" "GET" "/v1/packages"
check "GET /v1/packages?limit=5"       "200" "GET" "/v1/packages?limit=5"
check "GET /v1/packages/nonexistent-id returns 404" "404" "GET" "/v1/packages/nonexistent_id_xyz"

# ── Auth (should reject unauthenticated) ──────────────────────────────────────
title "Auth Guards"
check "POST /v1/packages requires auth (401)"  "401" "POST" "/v1/packages" '{"packageId":"test"}'
check "GET /v1/packages/my-packages requires auth (401)" "401" "GET" "/v1/packages/my-packages"
check "GET /v1/auth/api-keys requires auth (401)" "401" "GET" "/v1/auth/api-keys"
check "GET /v1/admin/stats requires auth (401)" "401" "GET" "/v1/admin/stats"

# ── CSRF protection ───────────────────────────────────────────────────────────
title "CSRF Protection"
check "POST /v1/packages without Origin header returns 403" "403" "POST" "/v1/packages"

# ── Reviews ───────────────────────────────────────────────────────────────────
title "Reviews API (Public)"
check "GET /v1/reviews returns 200"    "200" "GET" "/v1/reviews"

# ── Docs ─────────────────────────────────────────────────────────────────────
title "API Documentation"
check "GET /docs returns 200"          "200" "GET" "/docs"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────"
if [[ $FAIL -eq 0 ]]; then
  green "All $PASS smoke tests passed! ✅"
  exit 0
else
  red "$FAIL of $((PASS + FAIL)) tests failed"
  exit 1
fi
