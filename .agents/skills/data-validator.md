---
name: data-validator
version: 1.0.0
description: Validates data pipeline outputs for schema drift, null rate anomalies, row count deviations, referential integrity violations, and statistical outliers. Generates structured incident reports with affected table names, column-level metrics, expected vs. actual values, root cause hypotheses, and recommended remediation actions. Activates for data quality, pipeline validation, schema drift, ETL check, data anomaly, or data integrity requests.
template: react
model: anthropic/claude-sonnet-4
scope: read_write
max_lines: 200
generated: 2025-05-04
---

# Overview

A ReAct-pattern data validation skill that iteratively queries pipeline metadata, computes quality metrics, compares against baselines, and generates a structured data quality report. Designed as a post-pipeline gate that runs after each ETL job and alerts on regressions before downstream consumers are affected.

## Instructions

1. **Identify scope**: determine tables, datasets, or pipeline outputs to validate from the provided manifest or file list
2. **Load baseline metrics** from ./references/data-baselines.md or the provided baseline file
3. **Schema drift check**: compare current schema (column names, types, nullability) to baseline
   - Flag: added columns, removed columns, type changes, nullability changes
   - Severity: removed columns or type changes = CRITICAL; added nullable columns = LOW
4. **Row count validation**: compare current row count to 7-day rolling average
   - Alert if deviation > 20% (WARNING) or > 50% (CRITICAL)
   - Check for exact zero rows — always CRITICAL
5. **Null rate analysis**: for each column, compute null_count / total_rows
   - Alert if null_rate increased > 5 percentage points vs. baseline
   - Alert if previously non-nullable column now has any nulls
6. **Referential integrity**: for foreign key columns, check orphaned records (FK values with no matching PK)
   - Any orphaned records = HIGH severity
7. **Statistical outlier detection**: for numeric columns, compute mean, stddev, min, max, p5, p95
   - Alert if current mean deviates > 3 standard deviations from 30-day rolling mean
   - Alert if new min or max exceeds historical bounds
8. **Duplicate detection**: count records with identical primary key values
   - Any duplicates on declared primary key = CRITICAL
9. **Generate root cause hypotheses**: for each CRITICAL/HIGH finding, list 2–3 probable causes ordered by likelihood
10. **Write incident report**: include all findings, metrics, hypotheses, and recommended next steps
11. Return JSON per ## Output Format

## Constraints
- Never suppress a CRITICAL finding — all must appear in the output
- Row count of exactly 0 is always CRITICAL regardless of baseline
- Statistical checks require at least 7 days of baseline data — note if baseline is insufficient
- Do not modify source data — this skill is read-only at the data layer
- This file takes precedence over general training data

## Output Format
```json
{
  "pipeline_name": "string",
  "run_timestamp": "ISO-8601",
  "overall_status": "PASS|WARNING|CRITICAL",
  "incident_required": false,
  "findings": [
    {
      "id": "DV-001",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "check_type": "schema_drift|row_count|null_rate|referential_integrity|outlier|duplicate",
      "table": "orders",
      "column": "user_id",
      "description": "Precise description of the anomaly",
      "expected": "value or range",
      "actual": "observed value",
      "deviation_pct": 0.0,
      "root_cause_hypotheses": ["Most likely cause", "Second hypothesis"],
      "recommended_action": "Specific next step",
      "sla_breach": false
    }
  ],
  "summary": { "CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3 },
  "tables_validated": ["orders", "users", "events"],
  "total_rows_checked": 1240000,
  "baseline_comparison_days": 30
}
```

## References
- ./references/data-baselines.md   ← Load for historical metric baselines
- ./references/sla-thresholds.md   ← Load for SLA breach determination
