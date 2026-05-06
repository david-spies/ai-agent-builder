---
name: permissions
version: 1.0.0
description: Role-based access control (RBAC) and permission scope definitions for AI agents. Defines tool-level permissions, environment variable requirements, least-privilege defaults, and runtime scope validation. Load when configuring agent tool access, reviewing what an agent is authorized to do, or setting up a new deployment environment.
load: on-demand
---

# Permissions — RBAC and Tool Access Control
# Ai-Agent Builder · References
# Principle of least privilege by default

version: 1.0.0
default_scope: read_only
generated: 2025-05-04

---

## Scope Hierarchy (Least to Most Privileged)

```
read_only
    └── read_write
            └── elevated
                    └── admin (HITL required for all actions)
```

Each scope is a strict superset of the one above it. An agent with `read_write` has all `read_only` permissions plus write capabilities.

---

## Scope Definitions

### read_only
```yaml
scope: read_only
description: Safe for untrusted inputs, research tasks, Q&A, summarization
permitted:
  file:
    - read any file in declared workspace
    - list directory contents
  web:
    - search (GET requests to approved search APIs)
    - fetch public URLs (GET only, no auth)
  vector_db:
    - query (semantic search)
    - retrieve by ID
  memory:
    - read MEMORIES.md
    - read thread history
  code:
    - syntax checking (no execution)
    - static analysis (read-only mode)
denied:
  - file:write
  - file:delete
  - web:post (any POST/PUT/PATCH/DELETE request)
  - code:execute
  - api:write
  - database:write
  - secrets:read (no access to secret manager)
hitl_required: never
```

### read_write
```yaml
scope: read_write
description: Standard operational scope. Write to declared workspace only.
permitted:
  file:
    - read any file in declared workspace
    - write to /tmp and declared output directories only
    - create new files (no overwrite of existing without confirmation)
  web:
    - all read_only web permissions
    - POST to explicitly allowlisted endpoints only
  vector_db:
    - all read_only vector_db permissions
    - upsert new embeddings to declared collection
  memory:
    - read and write MEMORIES.md
    - update thread history
  code:
    - syntax checking
    - lint (no execution)
denied:
  - file:write outside declared workspace
  - file:delete (any)
  - code:execute
  - database:write
  - secrets:read
hitl_required:
  - web:post (any external API write)
  - file:write (outside /tmp)
```

### elevated
```yaml
scope: elevated
description: Developer/automation scope. Code execution in sandbox. External API calls.
permitted:
  file:
    - all read_write permissions
    - write to any path in declared workspace
    - read-only access to /etc/hosts, /etc/resolv.conf
  web:
    - all read_write web permissions
    - fetch with authentication headers (to allowlisted domains)
  code:
    - execute in Docker/gVisor sandbox (no network by default)
    - install packages from approved registries (PyPI, npm)
  api:
    - call external APIs on allowlist with rate limiting
  database:
    - SELECT, INSERT on declared tables
    - no DELETE, no DROP, no schema changes
  secrets:
    - read declared secrets from vault (not environment variables directly)
denied:
  - database:delete
  - database:drop
  - database:schema_change
  - file:delete (any system files)
  - secrets:write
  - permission:change (cannot self-escalate)
hitl_required:
  - code:execute (first execution in session)
  - api:call (any external write)
  - database:insert (if data_classification >= confidential)
```

### admin
```yaml
scope: admin
description: Full access. Every action requires HITL approval. Never default.
permitted:
  - all elevated permissions
  - file:delete
  - database:delete (with HITL)
  - database:schema_change (with HITL)
  - secrets:write (with HITL)
  - permission:change (with dual HITL)
hitl_required: EVERY ACTION — no exceptions
logging: EVERY ACTION at CRITICAL severity
approval_count: 2 operators required for destructive actions
```

---

## Tool-Level Permission Matrix

| Tool | read_only | read_write | elevated | admin |
|---|:---:|:---:|:---:|:---:|
| web_search | ✓ | ✓ | ✓ | ✓ |
| web_fetch (GET) | ✓ | ✓ | ✓ | ✓ |
| web_fetch (POST) | ✗ | HITL | ✓ | HITL |
| file_read | ✓ | ✓ | ✓ | ✓ |
| file_write (/tmp) | ✗ | ✓ | ✓ | ✓ |
| file_write (workspace) | ✗ | HITL | ✓ | HITL |
| file_delete | ✗ | ✗ | ✗ | HITL |
| code_lint | ✓ | ✓ | ✓ | ✓ |
| code_execute (sandbox) | ✗ | ✗ | HITL | HITL |
| vector_db_query | ✓ | ✓ | ✓ | ✓ |
| vector_db_write | ✗ | ✓ | ✓ | ✓ |
| db_select | ✗ | ✓ | ✓ | ✓ |
| db_insert | ✗ | HITL | HITL | HITL |
| db_delete | ✗ | ✗ | ✗ | HITL |
| db_schema_change | ✗ | ✗ | ✗ | HITL |
| secrets_read | ✗ | ✗ | ✓ (vault) | ✓ |
| secrets_write | ✗ | ✗ | ✗ | HITL |
| api_call_read | ✗ | ✓ | ✓ | ✓ |
| api_call_write | ✗ | HITL | HITL | HITL |
| permission_change | ✗ | ✗ | ✗ | HITL ×2 |

Legend: ✓ = allowed · ✗ = denied · HITL = allowed with human approval

---

## Environment Variables

Required and optional environment variables by scope:

```yaml
read_only:
  required:
    - ANTHROPIC_API_KEY        # or OPENAI_API_KEY, GOOGLE_API_KEY
  optional:
    - AUDIT_LOG_PATH           # default: ./audit-{session_id}.jsonl
    - LOG_LEVEL                # default: INFO

read_write:
  required:
    - ANTHROPIC_API_KEY
    - WORKSPACE_ROOT           # Absolute path to declared workspace
  optional:
    - AUDIT_LOG_ENDPOINT       # SIEM streaming endpoint
    - SLACK_WEBHOOK_URL        # HITL notifications
    - VECTOR_DB_URL            # if Agentic RAG enabled

elevated:
  required:
    - ANTHROPIC_API_KEY
    - WORKSPACE_ROOT
    - VAULT_ADDR               # HashiCorp Vault or AWS Secrets Manager
    - VAULT_TOKEN              # or AWS_ROLE_ARN for IAM auth
    - SANDBOX_RUNTIME          # "docker" or "gvisor"
  optional:
    - AUDIT_LOG_ENDPOINT
    - SLACK_WEBHOOK_URL
    - PAGERDUTY_KEY            # P0/P1 incident alerting
    - DATADOG_API_KEY          # Metrics streaming
    - DATABASE_URL             # If db tools enabled

admin:
  required:
    - All elevated variables
    - ADMIN_APPROVAL_WEBHOOK   # Dual-approval endpoint
    - AUDIT_IMMUTABLE_STORE    # Immutable audit storage (S3 Object Lock etc.)
  restricted:
    - Must be injected via secrets manager — never .env file
    - Must be rotated every 90 days
    - Must not be logged, even in debug mode

never_permitted_in_env:
  - Passwords in plain text
  - Database connection strings with embedded credentials
  - Private keys or certificates
  - PII of any kind
```

---

## Runtime Scope Validation

```python
from enum import Enum
from typing import Set

class Scope(Enum):
    READ_ONLY = "read_only"
    READ_WRITE = "read_write"
    ELEVATED = "elevated"
    ADMIN = "admin"

SCOPE_HIERARCHY = {
    Scope.READ_ONLY:  0,
    Scope.READ_WRITE: 1,
    Scope.ELEVATED:   2,
    Scope.ADMIN:      3,
}

HITL_REQUIRED_ACTIONS = {
    Scope.READ_WRITE: {"web:post", "file:write"},
    Scope.ELEVATED:   {"code:execute", "api:write", "db:insert"},
    Scope.ADMIN:      {"*"},  # All actions
}

class PermissionGuard:
    def __init__(self, declared_scope: str, hitl_callback=None):
        self.scope = Scope(declared_scope)
        self.hitl_callback = hitl_callback

    def check(self, action: str) -> bool:
        """Returns True if action is permitted. Raises if denied."""
        scope_level = SCOPE_HIERARCHY[self.scope]

        # Check if action is in HITL set for current scope
        hitl_set = HITL_REQUIRED_ACTIONS.get(self.scope, set())
        if "*" in hitl_set or action in hitl_set:
            if self.hitl_callback:
                approved = self.hitl_callback(action)
                if not approved:
                    raise PermissionDeniedError(
                        f"Action '{action}' rejected by HITL operator."
                    )
            else:
                raise HitlNotConfiguredError(
                    f"Action '{action}' requires HITL but no callback configured."
                )

        # Check scope level allows action
        required_level = self._get_required_scope_level(action)
        if scope_level < required_level:
            raise PermissionDeniedError(
                f"Action '{action}' requires scope level {required_level} "
                f"but agent has scope level {scope_level} ({self.scope.value}). "
                f"Request elevated permissions via change management process."
            )

        return True

    def _get_required_scope_level(self, action: str) -> int:
        action_scope_map = {
            "file:read": 0, "web:search": 0, "web:fetch_get": 0,
            "file:write_tmp": 1, "vector_db:write": 1, "db:select": 1,
            "code:execute": 2, "secrets:read": 2, "api:write": 2,
            "file:delete": 3, "db:delete": 3, "permission:change": 3,
        }
        return action_scope_map.get(action, 3)  # default to admin if unknown
```

---

## Scope Declaration in SKILL.md

Every SKILL.md must declare its required scope:

```yaml
---
name: my-agent
version: 1.0.0
description: ...
scope: read_write          # declared scope — will be validated at runtime
required_tools:            # explicit tool list — only these are permitted
  - web_search
  - file_read
  - file_write_tmp
  - vector_db_query
optional_tools:            # tools that may be used with HITL
  - web_fetch_post
required_env_vars:
  - ANTHROPIC_API_KEY
  - WORKSPACE_ROOT
---
```

Attempting to use any tool not in `required_tools` or `optional_tools` will raise a `PermissionDeniedError` at runtime, regardless of the declared scope level.
