---
name: sequence
spec_version: 1.0.0
component_type: iterator
version: 1.0.0
description: Batch controller that defines how an agent processes arrays of items one-by-one without context window overflow. Prevents hallucination and item-skipping when handling bulk inputs (50 repos, 200 log lines, 1000 tickets). Instructs the downstream runner to instantiate the target skill once per item in a provided JSON list, with configurable concurrency, error handling, and progress tracking.
execution_mode: sequential
default_concurrency: 1
max_concurrency: 5
on_item_error: continue
checkpoint_enabled: true
generated: 2026-05-04
---

# Sequence — Iterator & Batch Controller
# Ai-Agent Builder · Logic Components
# Processes arrays of items without exhausting the context window.

---

## Purpose

Enterprises deal with bulk operations: "Audit these 50 repos," "Review these 200
log entries," "Triage these 1000 Jira tickets." Without a loop controller, an LLM
will either hallucinate processing items it never read, or silently skip items once
the context window fills.

The Sequence component instructs the external runner to instantiate the target
skill **once per item** in a provided list — keeping each invocation's context
clean and bounded.

---

## Configuration

```yaml
# Sequence runtime configuration
execution_mode: sequential        # sequential | parallel | chunked
concurrency: 1                    # parallel threads (1 = sequential, max 5)
chunk_size: 10                    # items per chunk when mode=chunked
max_items: 1000                   # hard ceiling — refuse larger batches
item_timeout_seconds: 120         # per-item wall-clock limit
total_timeout_seconds: 3600       # total batch timeout (1 hour)
on_item_error: continue           # continue | halt | retry
retry_count: 2                    # retries before marking item as failed
retry_backoff_seconds: 5          # initial backoff (doubles each retry)
checkpoint_enabled: true          # save progress so batch can resume
checkpoint_interval: 10           # checkpoint every N items
progress_reporting: true          # emit progress events to audit trail
```

---

## Input Schema

```json
{
  "items": [
    { "id": "item-001", "payload": { "...": "item-specific data" } },
    { "id": "item-002", "payload": { "...": "item-specific data" } }
  ],
  "target_skill": "code-review.md",
  "config_overrides": {
    "concurrency": 1,
    "on_item_error": "continue"
  },
  "context": {
    "batch_id": "uuid",
    "initiated_by": "user or upstream skill",
    "description": "Human-readable batch description"
  }
}
```

---

## Execution Algorithm

```
BATCH START
│
├── Validate: items[] is non-empty and ≤ max_items
├── Validate: target_skill exists in .agents/skills/
├── Log: batch_start event { batch_id, item_count, target_skill }
│
├── FOR EACH item IN items[]:
│   │
│   ├── Log: item_start { batch_id, item_id, item_index, total }
│   │
│   ├── Build isolated context:
│   │   { skill: target_skill, input: item.payload, batch_meta: { id, index, total } }
│   │
│   ├── Invoke target_skill with isolated context
│   │   (NO previous item results in context — clean window per item)
│   │
│   ├── ON SUCCESS:
│   │   ├── Append result to results[]
│   │   ├── Log: item_complete { item_id, duration_ms, status: "success" }
│   │   └── IF checkpoint_interval reached → write checkpoint file
│   │
│   ├── ON FAILURE (timeout or error):
│   │   ├── IF retry_count > 0: wait backoff, decrement retry_count, retry
│   │   ├── IF retries exhausted AND on_item_error == "continue":
│   │   │   ├── Append { item_id, status: "failed", error: "..." } to failed[]
│   │   │   └── Continue to next item
│   │   └── IF on_item_error == "halt":
│   │       ├── Log: batch_halted { item_id, reason }
│   │       └── STOP — return partial results + failed[]
│   │
│   └── IF progress_reporting: emit progress { completed, total, pct }
│
└── BATCH COMPLETE
    ├── Log: batch_complete { batch_id, succeeded, failed, duration_ms }
    └── Return: BatchResult (see Output Schema)
```

---

## Output Schema

```json
{
  "batch_id": "uuid",
  "target_skill": "code-review.md",
  "status": "complete|partial|halted",
  "items_total": 50,
  "items_succeeded": 47,
  "items_failed": 3,
  "duration_ms": 142000,
  "results": [
    {
      "item_id": "item-001",
      "status": "success",
      "duration_ms": 2840,
      "output": { "...": "skill output for this item" }
    }
  ],
  "failed": [
    {
      "item_id": "item-012",
      "status": "failed",
      "error": "Timeout after 120s",
      "retries_attempted": 2
    }
  ],
  "checkpoint_file": "./.checkpoints/batch-uuid.json"
}
```

---

## Checkpoint File Format

Allows a halted or failed batch to resume from the last saved point:

```json
{
  "batch_id": "uuid",
  "target_skill": "code-review.md",
  "last_completed_index": 39,
  "items_remaining": [
    { "id": "item-040", "payload": {} }
  ],
  "partial_results": [],
  "checkpoint_at": "ISO-8601"
}
```

Resume command:
```bash
# Runner reads checkpoint and resumes from item 40
agent-runner sequence resume --checkpoint .checkpoints/batch-uuid.json
```

---

## Constraints
- Each item MUST receive a clean, isolated context — no cross-contamination between items
- Items MUST be processed in declared order when execution_mode is sequential
- The runner MUST NOT pass more than one item's payload to the LLM per invocation
- Batch size exceeding max_items MUST be rejected with a clear error before execution starts
- Checkpoint files MUST be written atomically to prevent corruption
- On partial completion, results for succeeded items are always returned even if batch halted

## References
- ./references/audit-trails.md     ← Required: batch_start, item_complete, batch_complete events
- ./references/guardrails.md       ← Applied per-item, not once for the whole batch
- ./.checkpoints/                  ← Checkpoint storage directory (auto-created by runner)
