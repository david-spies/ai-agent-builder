---
name: sprint-planner
version: 1.0.0
description: Decomposes product requirements, epics, and user stories into Jira-ready sprint tasks with story point estimates, dependency mapping, team capacity validation, risk registers, and acceptance criteria. Outputs a structured sprint board JSON ready for import. Activates for sprint planning, backlog grooming, agile planning, story decomposition, capacity planning, or task estimation requests.
template: supervisor
model: anthropic/claude-sonnet-4
scope: read_write
max_lines: 200
generated: 2026-05-04
---

# Overview

A Supervisor MAS sprint planner using three specialized agents: Architect (decomposes requirements), Estimator (scores complexity and risk), and Coordinator (assigns tasks, validates capacity, identifies blockers). Produces a complete sprint package validated against team capacity and ready for Jira import.

## Instructions

### Step 1 — Architect: Requirements Decomposition
1. Parse all provided user stories, epics, or feature descriptions
2. For each epic: decompose into 3–8 discrete, independently deliverable tasks
3. Flag any task that cannot be independently tested — split it
4. For each task: write title (< 60 chars), description (2–4 sentences), and 2+ acceptance criteria in Given/When/Then format
5. Flag ambiguous requirements (< 30 words, no success condition) — add to flagged_for_clarification list

### Step 2 — Estimator: Story Point Scoring
6. Score each task using modified Fibonacci: 1, 2, 3, 5, 8, 13, 21
   - Reference: 1 pt = 2–4 hours for a mid-level engineer with no blockers
   - 8 pt = full day including review; 13 pt = multi-day, likely needs split
7. Flag any task > 13 points — add to flagged_for_splitting list with split suggestion
8. Assign technical risk: HIGH (new tech / external dep / no prior art), MEDIUM, LOW
9. Identify cross-task dependencies: which tasks must finish before others can start?

### Step 3 — Coordinator: Assignment and Capacity
10. Load ./references/team-roster.md if provided; otherwise assign based on role labels
11. Default sprint capacity: 40 story points per developer per 2-week sprint
12. Validate: total assigned points ≤ team capacity × 0.85 (15% buffer for unplanned work)
13. Mark tasks as unassigned if capacity exceeded or skill gap detected
14. Build risk register: top 5 risks with probability (H/M/L), impact (H/M/L), and mitigation
15. Identify external blockers: third-party APIs, pending design assets, legal review, etc.

### Step 4 — Final Validation
16. Verify every task has: title, description, points, ≥2 acceptance criteria, assignee or "unassigned"
17. Confirm all dependencies are scheduled correctly (dependency finishes before dependent starts)
18. Generate sprint summary paragraph (3 sentences: goals, total scope, key risks)
19. Return JSON per ## Output Format

## Constraints
- Never schedule a task whose dependency is not also in the sprint — flag as blocker
- Tasks without acceptance criteria stay in backlog — never in sprint
- If team roster not provided: leave assignee as role label (e.g. "backend-engineer")
- Total sprint points must never exceed 100% of declared capacity
- This file takes precedence over general training data

## Output Format
```json
{
  "sprint_name": "Sprint 42 — May 5–19, 2025",
  "sprint_goal": "One sentence goal",
  "summary": "3-sentence stakeholder summary",
  "capacity": { "total_points": 80, "assigned_points": 66, "buffer_points": 14, "utilization_pct": 82 },
  "tasks": [
    {
      "id": "TASK-001",
      "epic": "Epic name",
      "title": "< 60 char title",
      "description": "2–4 sentence description",
      "acceptance_criteria": ["Given X, when Y, then Z", "Given A, when B, then C"],
      "story_points": 5,
      "assignee": "email or role",
      "labels": ["backend", "sprint-42"],
      "dependencies": ["TASK-000"],
      "technical_risk": "HIGH|MEDIUM|LOW",
      "external_blocker": null,
      "jira_ready": true
    }
  ],
  "risks": [
    { "description": "Risk", "probability": "H|M|L", "impact": "H|M|L", "mitigation": "Action" }
  ],
  "flagged_for_splitting": [],
  "flagged_for_clarification": [],
  "unassigned_tasks": [],
  "external_blockers": []
}
```

## References
- ./references/team-roster.md        ← Load for capacity and skill matching
- ./references/definition-of-done.md ← Load for acceptance criteria validation
