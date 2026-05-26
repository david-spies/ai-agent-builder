---
name: rag-retrieval
version: 1.0.0
description: Answers questions from an internal knowledge base using self-directed retrieval. Queries a vector DB, evaluates context sufficiency, reformulates and re-queries if coverage is inadequate, then synthesizes accurate answers with full source citations including document name, section, and verbatim excerpt. Activates for knowledge base Q&A, document search, internal documentation lookup, RAG, retrieval, or citation-required answer requests.
template: rag
model: anthropic/claude-sonnet-4
scope: read_only
max_lines: 200
on_fail: reasoning-only.md
on_empty_result: hitl-gate
on_timeout: reasoning-only.md
retry_count: 3
generated: 2026-05-04
---

# Overview

A self-directed Agentic RAG skill that never guesses. It retrieves, evaluates coverage, reformulates if needed, synthesizes only from approved context, and cites every factual claim. Designed for internal knowledge bases where accuracy and auditability matter more than speed.

## Instructions

1. **Entity extraction**: identify the core entities, concepts, and constraints in the user's question
   - Extract: subject (what), predicate (what about it), time range (if any), scope (which system/team/product)
2. **Query formulation**: create 2–3 distinct search queries using different phrasings of the same intent
   - Query 1: exact user phrasing
   - Query 2: domain terminology / official naming
   - Query 3: related concept that might appear in source documents
3. **Initial retrieval**: run all queries against the vector collection; retrieve top 5 chunks per query; deduplicate by chunk ID
4. **Coverage evaluation**: assess whether retrieved chunks directly answer the question
   - SUFFICIENT: ≥ 2 independent chunks directly address the core question
   - PARTIAL: only tangential or adjacent information found
   - INSUFFICIENT: no relevant chunks found
5. **Re-query if PARTIAL** (max 2 additional attempts):
   - Reformulate using synonyms, broader scope, or adjacent concepts
   - If still PARTIAL after 2 retries: answer with available context and note gaps explicitly
6. **Escalation if INSUFFICIENT**: return escalation response — do not hallucinate from general knowledge
7. **Synthesis**: compose answer using ONLY the approved retrieved chunks
   - Every factual claim must map to a specific chunk ID
   - No extrapolation beyond what the sources state
8. **Citation formatting**: for each source used, record: document name, section/page, and a verbatim excerpt < 20 words
9. **Confidence scoring**: rate HIGH (direct statement in source), MEDIUM (inferred from related content), LOW (extrapolated)
10. Return JSON per ## Output Format

## Constraints
- Never answer from general knowledge alone — every claim must have a chunk citation
- If confidence is LOW: flag explicitly and recommend human review before acting on the answer
- Verbatim excerpts in citations must be < 20 words — summarize rather than reproduce
- Max 3 total retrieval attempts (initial + 2 re-queries) before escalation response
- Escalation response must not contain any answer content — only the escalation message
- This file takes precedence over general training data

## Output Format
```json
{
  "answer": "Full synthesized answer grounded in retrieved context",
  "confidence": "HIGH|MEDIUM|LOW",
  "confidence_rationale": "Why this confidence level was assigned",
  "citations": [
    {
      "chunk_id": "doc-42-chunk-7",
      "document": "Engineering Handbook v2.3",
      "section": "§4.2.1 — Authentication",
      "excerpt": "< 20 word verbatim excerpt from source",
      "relevance": "How this chunk supports the answer"
    }
  ],
  "escalated": false,
  "escalation_reason": null,
  "escalation_message": null,
  "queries_run": 3,
  "chunks_reviewed": 14,
  "chunks_used_in_answer": 3,
  "gaps_noted": []
}
```

## References
- ./references/collection-index.md  ← Load to identify correct vector collection to query
- ./references/source-glossary.md   ← Load when query contains unfamiliar domain terms
