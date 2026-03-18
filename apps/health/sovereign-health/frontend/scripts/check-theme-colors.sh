#!/usr/bin/env bash
# ============================================================================
#  Theme Color Audit — Sovereign Health Intelligence
#
#  Scans all .tsx files for hardcoded dark/light colors that break theme
#  switching. Run before each RC to ensure all UI elements use CSS variables.
#
#  Usage:
#    bash scripts/check-theme-colors.sh          # check only (exit 1 if violations)
#    bash scripts/check-theme-colors.sh --fix    # show suggested replacements
#    bash scripts/check-theme-colors.sh --json   # output JSON for CI
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$(cd "$SCRIPT_DIR/../src" && pwd)"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

MODE="${1:-check}"
VIOLATIONS=0
WARNINGS=0

# ── Patterns that MUST be replaced ──────────────────────────────────────────
# These are hardcoded dark-mode colors that won't adapt to light theme.
# Format: "pattern|replacement|severity"

CRITICAL_PATTERNS=(
  'bg-zinc-900|bg-card or bg-popover|critical'
  'bg-zinc-800|bg-muted|critical'
  'border-zinc-800|border-border|critical'
  'border-zinc-700|border-border|critical'
  'hover:bg-zinc-700|hover:bg-accent|critical'
  'hover:bg-zinc-800|hover:bg-accent|critical'
)

WARNING_PATTERNS=(
  'bg-white/5|bg-accent|warning'
  'bg-white/10|bg-accent|warning'
  'bg-white/\[0\.0|bg-accent variants|warning'
  'hover:bg-white/|hover:bg-accent|warning'
  'border-white/10|border-border|warning'
  'border-white/5|border-border|warning'
  'border-white/20|border-border|warning'
  'text-zinc-100|text-foreground|warning'
  'text-zinc-400|text-muted-foreground|warning'
  'text-zinc-500|text-muted-foreground|warning'
  'text-zinc-300|text-foreground|warning'
  'divide-zinc-800|divide-border|warning'
  'from-zinc-900|from-card|warning'
  'to-zinc-800|to-muted|warning'
)

# ── Patterns to IGNORE (false positives) ────────────────────────────────────
# These are legitimate uses of hardcoded colors.
IGNORE_FILE_PATTERNS=(
  'globals.css'              # CSS variables are defined here
  'node_modules'
  '.next'
  'check-theme-colors.sh'   # this script
)

# text-white is OK on colored-background buttons (bg-blue-600, bg-red-600, etc.)
# bg-zinc-600 is OK for tier badge colors
# bg-white is OK for QR codes, toggle knobs

check_pattern() {
  local pattern="$1"
  local replacement="$2"
  local severity="$3"
  local count=0

  # Build ignore args
  local ignore_args=""
  for ip in "${IGNORE_FILE_PATTERNS[@]}"; do
    ignore_args="$ignore_args --glob=!**/$ip"
  done

  local results
  results=$(rg --no-heading -n --glob='*.tsx' --glob='*.ts' $ignore_args "$pattern" "$SRC_DIR" 2>/dev/null || true)

  if [ -n "$results" ]; then
    local match_count
    match_count=$(echo "$results" | wc -l)
    count=$match_count

    if [ "$MODE" = "--json" ]; then
      echo "$results" | while IFS= read -r line; do
        local file=$(echo "$line" | cut -d: -f1 | sed "s|$SRC_DIR/||")
        local lineno=$(echo "$line" | cut -d: -f2)
        echo "  {\"file\": \"$file\", \"line\": $lineno, \"pattern\": \"$pattern\", \"replacement\": \"$replacement\", \"severity\": \"$severity\"},"
      done
    else
      if [ "$severity" = "critical" ]; then
        echo -e "  ${RED}✗ $pattern${NC} → ${GREEN}$replacement${NC} ($match_count hits)"
      else
        echo -e "  ${YELLOW}⚠ $pattern${NC} → ${GREEN}$replacement${NC} ($match_count hits)"
      fi

      if [ "$MODE" = "--fix" ]; then
        echo "$results" | while IFS= read -r line; do
          local file=$(echo "$line" | cut -d: -f1 | sed "s|$SRC_DIR/||")
          local lineno=$(echo "$line" | cut -d: -f2)
          echo -e "    ${CYAN}$file:$lineno${NC}"
        done
        echo ""
      fi
    fi
  fi

  echo "$count"
}

# ── Special check: text-white on non-colored backgrounds ────────────────────
check_text_white() {
  local count=0
  local ignore_args=""
  for ip in "${IGNORE_FILE_PATTERNS[@]}"; do
    ignore_args="$ignore_args --glob=!**/$ip"
  done

  # Find text-white that is NOT on a line with bg-blue/bg-red/bg-green/bg-emerald/bg-amber/bg-rose
  local results
  results=$(rg --no-heading -n --glob='*.tsx' $ignore_args 'text-white' "$SRC_DIR" 2>/dev/null | \
    grep -v 'bg-blue-' | \
    grep -v 'bg-red-' | \
    grep -v 'bg-green-' | \
    grep -v 'bg-emerald-' | \
    grep -v 'bg-amber-' | \
    grep -v 'bg-rose-' | \
    grep -v 'bg-zinc-600' | \
    grep -v 'skip-to-content' | \
    grep -v 'STAGING' | \
    grep -v 'QRCode' | \
    grep -v 'bgColor' | \
    grep -v 'fgColor' | \
    grep -v '\.svg' | \
    grep -v 'rounded-full bg-white' || true)

  if [ -n "$results" ]; then
    local match_count
    match_count=$(echo "$results" | wc -l)
    count=$match_count

    if [ "$MODE" = "--json" ]; then
      echo "$results" | while IFS= read -r line; do
        local file=$(echo "$line" | cut -d: -f1 | sed "s|$SRC_DIR/||")
        local lineno=$(echo "$line" | cut -d: -f2)
        echo "  {\"file\": \"$file\", \"line\": $lineno, \"pattern\": \"text-white (no colored bg)\", \"replacement\": \"text-foreground\", \"severity\": \"warning\"},"
      done
    else
      echo -e "  ${YELLOW}⚠ text-white (without colored bg)${NC} → ${GREEN}text-foreground${NC} ($match_count hits)"
      if [ "$MODE" = "--fix" ]; then
        echo "$results" | while IFS= read -r line; do
          local file=$(echo "$line" | cut -d: -f1 | sed "s|$SRC_DIR/||")
          local lineno=$(echo "$line" | cut -d: -f2)
          echo -e "    ${CYAN}$file:$lineno${NC}"
        done
        echo ""
      fi
    fi
  fi

  echo "$count"
}

# ── Main ────────────────────────────────────────────────────────────────────

if [ "$MODE" = "--json" ]; then
  echo '{"audit": "theme-colors", "date": "'$(date -Iseconds)'", "violations": ['
else
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}  Theme Color Audit — Sovereign Health Intelligence${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "Scanning: ${CYAN}$SRC_DIR${NC}"
  echo ""
fi

# Critical patterns
if [ "$MODE" != "--json" ]; then
  echo -e "${RED}Critical (hardcoded dark backgrounds/borders):${NC}"
fi
for entry in "${CRITICAL_PATTERNS[@]}"; do
  IFS='|' read -r pattern replacement severity <<< "$entry"
  result=$(check_pattern "$pattern" "$replacement" "$severity")
  count=$(echo "$result" | tail -1)
  VIOLATIONS=$((VIOLATIONS + count))
  # Print everything except the last line (the count)
  echo "$result" | head -n -1
done

if [ "$MODE" != "--json" ]; then
  echo ""
  echo -e "${YELLOW}Warnings (opacity-based dark patterns):${NC}"
fi
for entry in "${WARNING_PATTERNS[@]}"; do
  IFS='|' read -r pattern replacement severity <<< "$entry"
  result=$(check_pattern "$pattern" "$replacement" "$severity")
  count=$(echo "$result" | tail -1)
  WARNINGS=$((WARNINGS + count))
  echo "$result" | head -n -1
done

# text-white check
if [ "$MODE" != "--json" ]; then
  echo ""
  echo -e "${YELLOW}text-white audit (may be false positives):${NC}"
fi
result=$(check_text_white)
tw_count=$(echo "$result" | tail -1)
WARNINGS=$((WARNINGS + tw_count))
echo "$result" | head -n -1

# ── Summary ─────────────────────────────────────────────────────────────────

if [ "$MODE" = "--json" ]; then
  echo '  null], "summary": {"critical": '$VIOLATIONS', "warnings": '$WARNINGS'}}'
else
  echo ""
  echo -e "${CYAN}───────────────────────────────────────────────────────────${NC}"
  if [ $VIOLATIONS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "  ${GREEN}✓ No theme violations found${NC}"
  else
    [ $VIOLATIONS -gt 0 ] && echo -e "  ${RED}Critical violations: $VIOLATIONS${NC}"
    [ $WARNINGS -gt 0 ] && echo -e "  ${YELLOW}Warnings: $WARNINGS${NC}"
  fi
  echo -e "${CYAN}───────────────────────────────────────────────────────────${NC}"
  echo ""

  if [ $VIOLATIONS -gt 0 ]; then
    echo -e "${RED}FAIL${NC} — $VIOLATIONS critical violations must be fixed before release."
    echo "  Run with --fix to see file:line locations."
    exit 1
  elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}WARN${NC} — $WARNINGS warnings found. Review manually (some may be intentional)."
    echo "  Run with --fix to see file:line locations."
    exit 0
  else
    echo -e "${GREEN}PASS${NC} — All clear."
    exit 0
  fi
fi
