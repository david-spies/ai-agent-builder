#!/usr/bin/env python3
"""
eval-runner.py — Ai-Agent Builder Evaluation Framework Runner
Runs golden-set scenarios through LLM Judge and reports results.

Usage:
    python scripts/eval-runner.py --golden-set evals/golden-set/ --threshold 4.0
    python scripts/eval-runner.py --file evals/golden-set/security.json
    python scripts/eval-runner.py --compare-baseline evals/golden-set/baselines/production.json
"""

import os
import sys
import json
import time
import argparse
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional


# ── Config ────────────────────────────────────────────────────────────────────

JUDGE_MODEL = "claude-opus-4-20250514"
DEFAULT_THRESHOLD = 4.0
MAX_TOKENS = 2048

JUDGE_SYSTEM_PROMPT = """
You are an expert Senior Software Engineer, Security Auditor, and Technical Lead.
Evaluate the agent output against the task description with rigorous, consistent standards.

Score 1-5 for each criterion:
1. CORRECTNESS: Does it completely solve the stated task?
2. SECURITY: Are there vulnerabilities? (Any score <4 = deployment block)
3. MAINTAINABILITY: Is it readable, modular, well-documented?
4. EFFICIENCY: Minimal tokens, API calls, and compute used?

Return ONLY valid JSON matching this schema exactly:
{
  "scores": {
    "correctness": <int 1-5>,
    "security": <int 1-5>,
    "maintainability": <int 1-5>,
    "efficiency": <int 1-5>
  },
  "overall": <float, 1 decimal>,
  "verdict": "Pass" or "Fail",
  "block_deployment": <bool>,
  "blocking_reason": <null or string>,
  "reasoning": "<2-3 sentence summary>",
  "specific_issues": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "criterion": "correctness|security|maintainability|efficiency",
      "description": "<issue>",
      "remediation": "<fix>"
    }
  ],
  "strengths": ["<strength>"],
  "feed_to_agent": "<null or instruction for reflection loop>"
}
"""


# ── Colors ────────────────────────────────────────────────────────────────────

class Colors:
    RED    = '\033[0;31m'
    YELLOW = '\033[1;33m'
    GREEN  = '\033[0;32m'
    CYAN   = '\033[0;36m'
    BOLD   = '\033[1m'
    NC     = '\033[0m'

def red(s):    return f"{Colors.RED}{s}{Colors.NC}"
def yellow(s): return f"{Colors.YELLOW}{s}{Colors.NC}"
def green(s):  return f"{Colors.GREEN}{s}{Colors.NC}"
def cyan(s):   return f"{Colors.CYAN}{s}{Colors.NC}"
def bold(s):   return f"{Colors.BOLD}{s}{Colors.NC}"


# ── LLM Judge ─────────────────────────────────────────────────────────────────

def run_judge(
    task_description: str,
    agent_output: str,
    reference_solution: Optional[str],
    scenario_id: str
) -> dict:
    """Call LLM Judge and return structured evaluation result."""
    try:
        import anthropic
        client = anthropic.Anthropic()
    except ImportError:
        print(red("ERROR: anthropic package not installed. Run: pip install anthropic"))
        sys.exit(1)

    user_content = f"""### TASK DESCRIPTION
{task_description}

### AGENT GENERATED OUTPUT
{agent_output}

### REFERENCE SOLUTION
{reference_solution or "No reference provided — evaluate against task requirements only."}

### SCENARIO ID
{scenario_id}
"""

    try:
        response = client.messages.create(
            model=JUDGE_MODEL,
            max_tokens=MAX_TOKENS,
            system=JUDGE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}]
        )
        raw = response.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)

    except json.JSONDecodeError as e:
        return {
            "scores": {"correctness": 1, "security": 1, "maintainability": 1, "efficiency": 1},
            "overall": 1.0,
            "verdict": "Fail",
            "block_deployment": True,
            "blocking_reason": f"Judge returned invalid JSON: {e}",
            "reasoning": "Judge evaluation failed — invalid response format.",
            "specific_issues": [],
            "strengths": [],
            "feed_to_agent": None
        }
    except Exception as e:
        print(red(f"  Judge API error for {scenario_id}: {e}"))
        raise


# ── Tier A: Deterministic Checks ──────────────────────────────────────────────

def run_tier_a(scenario: dict) -> dict:
    """Run deterministic checks defined in scenario.evaluation.tier_a_checks."""
    checks = scenario.get("evaluation", {}).get("tier_a_checks", {})
    results = {"passed": True, "failures": []}

    expected_output = scenario.get("expected_output", {})
    must_contain = expected_output.get("must_contain", [])
    must_not_contain = expected_output.get("must_not_contain", [])

    # Simulate agent output check (in real use, pass actual output here)
    # For eval runner, we check against ground_truth
    ground_truth = expected_output.get("ground_truth", "")

    for phrase in must_contain:
        if phrase.lower() not in ground_truth.lower():
            results["failures"].append(f"Ground truth missing required phrase: '{phrase}'")
            results["passed"] = False

    for phrase in must_not_contain:
        if phrase.lower() in ground_truth.lower():
            results["failures"].append(f"Ground truth contains forbidden phrase: '{phrase}'")
            results["passed"] = False

    return results


# ── Scenario Runner ───────────────────────────────────────────────────────────

def run_scenario(scenario: dict, threshold: float, dry_run: bool = False) -> dict:
    """Run a single eval scenario. Returns result dict."""
    scenario_id = scenario.get("id", "unknown")
    name = scenario.get("name", scenario_id)
    complexity = scenario.get("complexity", "unknown")

    print(f"\n  {cyan('→')} [{scenario_id}] {name} ({complexity})")

    # Tier A
    tier_a = run_tier_a(scenario)
    if not tier_a["passed"]:
        print(f"    {red('✗')} Tier A FAILED: {tier_a['failures']}")
        return {
            "scenario_id": scenario_id,
            "name": name,
            "tier": "A",
            "verdict": "Fail",
            "tier_a": tier_a,
            "scores": None,
            "block_deployment": True,
            "error": "Tier A deterministic check failed"
        }

    print(f"    {green('✓')} Tier A passed")

    if dry_run:
        return {
            "scenario_id": scenario_id,
            "name": name,
            "tier": "dry_run",
            "verdict": "Skipped",
            "tier_a": tier_a,
            "scores": None
        }

    # Tier B — LLM Judge
    task = scenario.get("input", {}).get("user_request", "")
    context = scenario.get("input", {}).get("context", "")
    ground_truth = scenario.get("expected_output", {}).get("ground_truth", "")

    start = time.time()
    judge_result = run_judge(
        task_description=f"{task}\n\nContext: {context}" if context else task,
        agent_output=ground_truth,  # eval against ground truth
        reference_solution=None,
        scenario_id=scenario_id
    )
    elapsed = time.time() - start

    scores = judge_result.get("scores", {})
    overall = judge_result.get("overall", 0)
    verdict = judge_result.get("verdict", "Fail")
    block = judge_result.get("block_deployment", True)

    # Check per-criterion thresholds
    pass_threshold = scenario.get("evaluation", {}).get("pass_threshold", {})
    all_min = pass_threshold.get("all_criteria_minimum", threshold)
    sec_min = pass_threshold.get("security_minimum", 4)

    failed_criteria = []
    for criterion, score in scores.items():
        min_score = sec_min if criterion == "security" else all_min
        if score < min_score:
            failed_criteria.append(f"{criterion}={score}/{min_score}")

    scenario_verdict = "Pass" if not failed_criteria and not block else "Fail"

    score_str = " | ".join([
        f"C:{scores.get('correctness','?')}",
        f"S:{scores.get('security','?')}",
        f"M:{scores.get('maintainability','?')}",
        f"E:{scores.get('efficiency','?')}",
        f"Avg:{overall}"
    ])

    if scenario_verdict == "Pass":
        print(f"    {green('✓')} Judge PASSED  [{score_str}]  ({elapsed:.1f}s)")
    else:
        print(f"    {red('✗')} Judge FAILED  [{score_str}]  ({elapsed:.1f}s)")
        if failed_criteria:
            print(f"      Below threshold: {', '.join(failed_criteria)}")
        if judge_result.get("blocking_reason"):
            print(f"      Blocking reason: {judge_result['blocking_reason']}")

    return {
        "scenario_id": scenario_id,
        "name": name,
        "complexity": complexity,
        "verdict": scenario_verdict,
        "tier_a": tier_a,
        "scores": scores,
        "overall": overall,
        "block_deployment": block,
        "judge_reasoning": judge_result.get("reasoning"),
        "judge_elapsed_s": round(elapsed, 2),
        "failed_criteria": failed_criteria
    }


# ── Dataset Loader ────────────────────────────────────────────────────────────

def load_scenarios(golden_set_path: str) -> list:
    """Load all scenarios from a directory or single file."""
    path = Path(golden_set_path)
    scenarios = []

    if path.is_file():
        with open(path) as f:
            data = json.load(f)
        scenarios.extend(data.get("scenarios", []))
    elif path.is_dir():
        for json_file in sorted(path.glob("*.json")):
            with open(json_file) as f:
                data = json.load(f)
            for s in data.get("scenarios", []):
                s["_source_file"] = str(json_file.name)
            scenarios.extend(data.get("scenarios", []))

    return scenarios


# ── Baseline Comparison ───────────────────────────────────────────────────────

def compare_to_baseline(results: list, baseline_path: str) -> dict:
    """Compare current results to production baseline. Returns regression report."""
    if not Path(baseline_path).exists():
        return {"status": "no_baseline", "message": "No baseline file found — this run will become the baseline."}

    with open(baseline_path) as f:
        baseline = json.load(f)

    baseline_by_id = {s["scenario_id"]: s for s in baseline.get("scenarios", [])}
    regressions = []
    improvements = []

    for result in results:
        sid = result["scenario_id"]
        if sid not in baseline_by_id:
            continue
        base = baseline_by_id[sid]

        for criterion in ["correctness", "security", "maintainability", "efficiency"]:
            current_score = result.get("scores", {}).get(criterion)
            baseline_score = base.get("scores", {}).get(criterion)
            if current_score is None or baseline_score is None:
                continue
            delta = current_score - baseline_score
            if delta <= -0.3:
                regressions.append({
                    "scenario_id": sid,
                    "criterion": criterion,
                    "baseline": baseline_score,
                    "current": current_score,
                    "delta": round(delta, 2)
                })
            elif delta >= 0.5:
                improvements.append({
                    "scenario_id": sid,
                    "criterion": criterion,
                    "baseline": baseline_score,
                    "current": current_score,
                    "delta": round(delta, 2)
                })

    return {
        "status": "regression_found" if regressions else "clean",
        "regressions": regressions,
        "improvements": improvements,
        "block_deploy": len(regressions) > 0
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Ai-Agent Builder Eval Runner")
    parser.add_argument("--golden-set", default="evals/golden-set/", help="Path to golden set dir or file")
    parser.add_argument("--file", help="Run a single JSON file only")
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    parser.add_argument("--compare-baseline", help="Path to baseline JSON for regression check")
    parser.add_argument("--dry-run", action="store_true", help="Skip LLM judge calls")
    parser.add_argument("--output", default="eval-results.json", help="Output file for results")
    parser.add_argument("--fail-on-regression", action="store_true")
    args = parser.parse_args()

    print(f"\n{bold('════════════════════════════════════════════')}")
    print(f"{bold('  Ai-Agent Builder — Eval Runner')}")
    print(f"  Judge model: {JUDGE_MODEL}")
    print(f"  Threshold: {args.threshold}/5.0 on all criteria")
    print(f"{bold('════════════════════════════════════════════')}")

    source = args.file or args.golden_set
    scenarios = load_scenarios(source)

    if not scenarios:
        print(red(f"No scenarios found in: {source}"))
        sys.exit(1)

    print(f"\n  Loaded {len(scenarios)} scenario(s) from: {source}")

    results = []
    start_total = time.time()

    for scenario in scenarios:
        result = run_scenario(scenario, args.threshold, dry_run=args.dry_run)
        results.append(result)

    total_elapsed = time.time() - start_total

    # ── Summary ───────────────────────────────────────────────────────────────
    passed = sum(1 for r in results if r["verdict"] == "Pass")
    failed = sum(1 for r in results if r["verdict"] == "Fail")
    blocked = sum(1 for r in results if r.get("block_deployment"))
    pass_rate = (passed / len(results) * 100) if results else 0

    print(f"\n{bold('────────────────────────────────────────────')}")
    print(f"  Results: {green(str(passed))} passed / {red(str(failed))} failed / {len(results)} total")
    print(f"  Pass rate: {green(f'{pass_rate:.1f}%') if pass_rate >= 90 else red(f'{pass_rate:.1f}%')}")
    print(f"  Deployment blocks: {red(str(blocked)) if blocked else green('0')}")
    print(f"  Total time: {total_elapsed:.1f}s")

    # Baseline comparison
    comparison = {}
    if args.compare_baseline:
        comparison = compare_to_baseline(results, args.compare_baseline)
        if comparison["regressions"]:
            print(f"\n  {red('⚠ REGRESSIONS DETECTED:')}")
            for r in comparison["regressions"]:
                print(f"    [{r['scenario_id']}] {r['criterion']}: {r['baseline']} → {r['current']} (Δ{r['delta']})")
        if comparison["improvements"]:
            print(f"\n  {green('✓ IMPROVEMENTS:')}")
            for i in comparison["improvements"]:
                print(f"    [{i['scenario_id']}] {i['criterion']}: {i['baseline']} → {i['current']} (+{i['delta']})")

    # Save results
    output = {
        "meta": {
            "run_at": datetime.now(timezone.utc).isoformat(),
            "judge_model": JUDGE_MODEL,
            "threshold": args.threshold,
            "source": source,
            "total_scenarios": len(scenarios),
            "passed": passed,
            "failed": failed,
            "pass_rate_pct": round(pass_rate, 1),
            "total_elapsed_s": round(total_elapsed, 2),
        },
        "scenarios": results,
        "baseline_comparison": comparison
    }

    with open(args.output, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n  Results saved to: {args.output}")
    print(f"{bold('════════════════════════════════════════════')}\n")

    # Exit codes
    if blocked > 0:
        sys.exit(2)  # Deployment blocked
    if failed > 0:
        sys.exit(1)  # Failures but no deployment block
    if args.fail_on_regression and comparison.get("block_deploy"):
        sys.exit(3)  # Regression detected
    sys.exit(0)  # All passed


if __name__ == "__main__":
    main()
