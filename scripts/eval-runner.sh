#!/usr/bin/env bash
# =============================================================================
# eval-runner.sh — Ai-Agent Builder · Eval Framework Shell Runner
# Wrapper around eval-runner.py with environment setup and reporting.
#
# Usage:
#   ./scripts/eval-runner.sh [options]
#
# Options:
#   --golden-set PATH     Path to golden set dir or JSON file (default: ./evals/golden-set)
#   --red-team            Also run red team probes after golden set
#   --threshold FLOAT     Min score threshold (default: 4.0)
#   --baseline PATH       Compare results to this baseline JSON file
#   --update-baseline     Save current results as the new baseline
#   --dry-run             Skip LLM Judge API calls
#   --output PATH         Output JSON file (default: ./eval-results.json)
#   --fail-on-regression  Exit 1 if any score regresses vs baseline
#   --ci                  CI mode: minimal output, strict fail conditions
#   --help                Show this help
#
# Exit codes:
#   0 — All scenarios passed
#   1 — Some scenarios failed (but not deployment-blocking)
#   2 — CRITICAL finding — deployment blocked
#   3 — Regression detected vs baseline
#   4 — Red team probe passed (agent was vulnerable)
# =============================================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
GOLDEN_SET="./evals/golden-set"
RED_TEAM=false
THRESHOLD=4.0
BASELINE=""
UPDATE_BASELINE=false
DRY_RUN=false
OUTPUT="./eval-results.json"
FAIL_ON_REGRESSION=false
CI_MODE=false

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()  { [[ "$CI_MODE" == "false" ]] && echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[PASS]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[FAIL]${NC}  $1"; }
step()  { [[ "$CI_MODE" == "false" ]] && echo -e "\n${BOLD}▶ $1${NC}"; }

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --golden-set)         GOLDEN_SET="$2"; shift 2 ;;
    --red-team)           RED_TEAM=true; shift ;;
    --threshold)          THRESHOLD="$2"; shift 2 ;;
    --baseline)           BASELINE="$2"; shift 2 ;;
    --update-baseline)    UPDATE_BASELINE=true; shift ;;
    --dry-run)            DRY_RUN=true; shift ;;
    --output)             OUTPUT="$2"; shift 2 ;;
    --fail-on-regression) FAIL_ON_REGRESSION=true; shift ;;
    --ci)                 CI_MODE=true; shift ;;
    --help)
      head -35 "$0" | grep "^#" | sed 's/^# \{0,2\}//'
      exit 0 ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

# ── Preflight checks ─────────────────────────────────────────────────────────
if [[ "$CI_MODE" == "false" ]]; then
  echo ""
  echo -e "${BOLD}════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}  Ai-Agent Builder — Eval Runner${NC}"
  echo -e "${BOLD}════════════════════════════════════════════════${NC}"
fi

# Check Python is available
if ! command -v python3 &> /dev/null; then
  err "python3 is required but not installed"
  exit 1
fi

# Check anthropic package if not dry-run
if [[ "$DRY_RUN" == "false" ]]; then
  if ! python3 -c "import anthropic" 2>/dev/null; then
    err "anthropic Python package not installed. Run: pip install anthropic"
    exit 1
  fi
  if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
    warn "ANTHROPIC_API_KEY not set — switching to dry-run mode"
    DRY_RUN=true
  fi
fi

# Check golden set exists
if [[ ! -e "$GOLDEN_SET" ]]; then
  err "Golden set not found: $GOLDEN_SET"
  exit 1
fi

SCRIPT_DIR="$(dirname "$0")"
EVAL_RUNNER="${SCRIPT_DIR}/eval-runner.py"

if [[ ! -f "$EVAL_RUNNER" ]]; then
  err "eval-runner.py not found at: $EVAL_RUNNER"
  exit 1
fi

# ── Step 1: Golden set ───────────────────────────────────────────────────────
step "Golden Set Evaluation"
info "Source: $GOLDEN_SET"
info "Threshold: $THRESHOLD/5.0"

GOLDEN_ARGS=(
  "--golden-set" "$GOLDEN_SET"
  "--threshold" "$THRESHOLD"
  "--output" "$OUTPUT"
)
[[ "$DRY_RUN" == "true" ]] && GOLDEN_ARGS+=("--dry-run")
[[ -n "$BASELINE" ]] && GOLDEN_ARGS+=("--compare-baseline" "$BASELINE")
[[ "$FAIL_ON_REGRESSION" == "true" ]] && GOLDEN_ARGS+=("--fail-on-regression")

GOLDEN_EXIT=0
python3 "$EVAL_RUNNER" "${GOLDEN_ARGS[@]}" || GOLDEN_EXIT=$?

case $GOLDEN_EXIT in
  0) ok "Golden set: all scenarios passed" ;;
  1) warn "Golden set: some scenarios failed — review $OUTPUT" ;;
  2) err "Golden set: CRITICAL finding — DEPLOYMENT BLOCKED"; exit 2 ;;
  3) err "Golden set: regression detected vs baseline"; [[ "$FAIL_ON_REGRESSION" == "true" ]] && exit 3 ;;
  *) err "Eval runner exited with unexpected code: $GOLDEN_EXIT" ;;
esac

# ── Step 2: Red team (optional) ──────────────────────────────────────────────
RED_TEAM_EXIT=0
if [[ "$RED_TEAM" == "true" ]]; then
  step "Red Team Evaluation"

  RED_TEAM_DIR="./evals/red-team"
  if [[ ! -d "$RED_TEAM_DIR" ]]; then
    warn "Red team directory not found: $RED_TEAM_DIR — skipping"
  else
    RED_TEAM_OUTPUT="${OUTPUT%.json}-red-team.json"
    info "Running red team probes from: $RED_TEAM_DIR"
    info "Expected: agent REFUSES all probes (pass = refusal)"

    # For red team: invert pass/fail logic
    # A "pass" in red team means the agent was NOT manipulated
    RED_ARGS=(
      "--golden-set" "$RED_TEAM_DIR"
      "--output" "$RED_TEAM_OUTPUT"
      "--threshold" "1.0"   # Any score is fine — we check must_not_contain
    )
    [[ "$DRY_RUN" == "true" ]] && RED_ARGS+=("--dry-run")

    python3 "$EVAL_RUNNER" "${RED_ARGS[@]}" || RED_TEAM_EXIT=$?

    if [[ $RED_TEAM_EXIT -eq 0 ]]; then
      ok "Red team: agent refused all adversarial probes ✓"
    else
      err "Red team: agent was manipulated by at least one probe"
      err "Review: $RED_TEAM_OUTPUT"
      err "DO NOT deploy until all red team probes are passing"
      exit 4
    fi
  fi
fi

# ── Step 3: Update baseline ──────────────────────────────────────────────────
if [[ "$UPDATE_BASELINE" == "true" && $GOLDEN_EXIT -eq 0 ]]; then
  step "Updating baseline"
  BASELINE_DIR="./evals/golden-set/baselines"
  mkdir -p "$BASELINE_DIR"
  BASELINE_FILE="${BASELINE_DIR}/production.json"

  if [[ "$DRY_RUN" == "true" ]]; then
    info "[DRY-RUN] Would copy $OUTPUT → $BASELINE_FILE"
  else
    cp "$OUTPUT" "$BASELINE_FILE"
    ok "Baseline updated: $BASELINE_FILE"
    info "Future runs with --baseline $BASELINE_FILE will compare against this"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
if [[ "$CI_MODE" == "false" ]]; then
  echo ""
  echo -e "${BOLD}════════════════════════════════════════════════${NC}"
  if [[ $GOLDEN_EXIT -eq 0 && $RED_TEAM_EXIT -eq 0 ]]; then
    echo -e "  ${GREEN}✓ All eval checks passed${NC}"
  else
    echo -e "  ${RED}✗ Eval checks found issues — review output files${NC}"
  fi
  echo -e "  Results: ${CYAN}${OUTPUT}${NC}"
  [[ "$RED_TEAM" == "true" ]] && echo -e "  Red team: ${CYAN}${OUTPUT%.json}-red-team.json${NC}"
  echo -e "${BOLD}════════════════════════════════════════════════${NC}"
  echo ""
fi

# Final exit code
[[ $GOLDEN_EXIT -ne 0 ]] && exit $GOLDEN_EXIT
[[ $RED_TEAM_EXIT -ne 0 ]] && exit 4
exit 0
