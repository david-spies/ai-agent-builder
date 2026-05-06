# CONTRIBUTING.md — Contribution Guidelines
# Ai-Agent Builder

version: 1.0.0
generated: 2026-05-04

---

## Welcome

Thank you for considering contributing to Ai-Agent Builder. This document covers everything you need to know to make a great contribution — from setting up your environment to the review process.

---

## Code of Conduct

Be respectful. Be constructive. We are building tools that will be deployed in enterprise environments — quality and security matter above all else. Contributions that reduce safety, add tracking, or lower code quality will not be accepted regardless of other merits.

---

## What We Need Help With

### High Priority
- **New agent templates** — voice assistant, DevOps engineer, data analyst, API designer
- **New skill files** — `.agents/skills/*.md` for common use cases
- **Eval scenarios** — adding to the golden-set JSON files
- **Red team probes** — new adversarial probe patterns
- **Bug fixes** — especially in the build engine and file generation logic

### Medium Priority
- **Export formats** — YAML, TOML, OpenAPI schema
- **Import support** — LangGraph JSON, CrewAI YAML, existing SKILL.md files
- **i18n** — internationalization of the builder UI
- **Accessibility** — ARIA labels, keyboard navigation improvements

### Low Priority (discuss in issue first)
- UI redesigns
- Framework changes
- New dependencies (we prefer zero dependencies)

---

## Development Setup

```bash
# Clone
git clone https://github.com/your-org/ai-agent-builder.git
cd ai-agent-builder

# No build step — just open the HTML file
open ai-agent-builder.html

# For automated tests
npm install          # installs Jest for unit tests
pip install anthropic pytest  # for eval runner tests

# Run unit tests
npm test

# Run linter
npm run lint

# Run eval suite (requires ANTHROPIC_API_KEY)
ANTHROPIC_API_KEY=your-key python scripts/eval-runner.py \
  --golden-set evals/golden-set/ --dry-run
```

---

## Project Structure for Contributors

```
ai-agent-builder.html      ← The entire application — all changes here
README.md                  ← Main documentation
CHANGELOG.md               ← Update this with your change
CONTRIBUTING.md            ← This file

.agents/skills/*.md        ← Add new skill templates here
references/*.md            ← Reference files (improve content here)
evals/golden-set/*.json    ← Add eval scenarios here
evals/red-team/*.md        ← Add red team probes here
scripts/                   ← Helper scripts (bash + python)
docs/                      ← Extended documentation
```

---

## Making Changes to ai-agent-builder.html

The entire application is in one file. It is organized into clear sections — use your editor's search to navigate:

| Section | Find this string |
|---|---|
| CSS Variables | `:root{` |
| Sidebar HTML | `<!-- ══ SIDEBAR ══ -->` |
| Canvas HTML | `<!-- ══ CANVAS ══ -->` |
| Right Panel HTML | `<!-- ══ RIGHT PANEL ══ -->` |
| Constants | `// ══════════════ CONSTANTS` |
| State Object | `// ══════════════ STATE` |
| Template Definitions | `const TEMPLATES = {` |
| Build Engine | `function doBuild()` |
| Download Logic | `function downloadPackage()` |
| Audit Log | `function log(` |

### Adding a New Template

**Step 1**: Add to `TEMPLATES` object in `<script>`:

```javascript
TEMPLATES['my-template'] = {
  name: 'My Template',
  pattern: 'My Pattern Description',
  overview: 'What this template does and when to use it...',
  instructions: [
    'Step 1: First thing the agent does',
    'Step 2: Second thing',
    'Step 3: Continue for 5-8 steps',
    'Step 4: Include error handling',
    'Step 5: Define done condition',
  ],
  roles: `- **Role Name (Lead)**: description of role
- **Worker Role**: description
- **Reviewer Role**: description`,
  pipelineNodes: ['Node1', 'Node2', 'Node3', 'Node4', 'Node5', 'Node6'],
  // Must always have exactly 6 nodes for 6-layer architecture
};
```

**Step 2**: Add template card to `#templates-grid` in HTML:

```html
<div class="tpl-card" id="tpl-my-template" onclick="selectTemplate('my-template')">
  <div class="tpl-icon">🎯</div>
  <div class="tpl-name">My Template</div>
  <div class="tpl-desc">Short 1-2 sentence description of when to use this</div>
</div>
```

**Step 3**: Add corresponding SKILL.md to `.agents/skills/`:

```bash
# Create skill file
cat > .agents/skills/my-template.md << 'EOF'
---
name: my-template
version: 1.0.0
description: [Your description here — this is the most important line]
template: my-template
...
EOF
```

**Step 4**: Add 2+ eval scenarios to `evals/golden-set/general.json`

**Step 5**: Test the template end-to-end in the browser

### Adding a New Quick Fill

```javascript
// In QUICK_FILLS object:
QUICK_FILLS['my-use-case'] = 'Detailed description of what the agent should do. Include the primary action, the domain, and the expected output format. Make it long enough to demonstrate the use case clearly — aim for 150-250 characters.';
```

```html
<!-- In .qfill-pills div: -->
<span class="qfill" onclick="quickFill('my-use-case')">My Use Case</span>
```

---

## Adding Eval Scenarios

Every new feature or bug fix should include at least one eval scenario.

```bash
# Open the relevant golden-set file
# (create a new file if starting a new domain)
nano evals/golden-set/my-domain.json
```

```json
{
  "dataset_name": "My Domain — Golden Set",
  "version": "1.0.0",
  "agent_template": "react",
  "scenarios": [
    {
      "id": "my-001",
      "name": "Descriptive scenario name",
      "complexity": "easy|medium|hard|edge-case|security-sensitive",
      "tags": ["my-domain", "relevant-tag"],
      "input": {
        "user_request": "The exact user prompt that triggers this skill",
        "context": "Any additional context (code snippet, environment state, etc.)"
      },
      "expected_output": {
        "must_contain": ["phrase that must appear in output"],
        "must_not_contain": ["phrase that must NOT appear"],
        "ground_truth": "The ideal correct answer for semantic comparison by LLM Judge"
      },
      "evaluation": {
        "tier_a_checks": {
          "compilable": true,
          "linting_passes": true
        },
        "pass_threshold": {
          "all_criteria_minimum": 4,
          "security_minimum": 4
        }
      },
      "metadata": {
        "created": "2025-05-04",
        "author": "your-github-handle",
        "notes": "Any special notes about this scenario"
      }
    }
  ]
}
```

---

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body — explain WHY, not WHAT]

[optional footer — BREAKING CHANGE: ..., Fixes #123]
```

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `skill` | New or improved skill file |
| `eval` | New eval scenarios or red team probes |
| `security` | Security improvement |
| `refactor` | Code change with no behavior change |
| `test` | Adding or improving tests |
| `chore` | Build, CI, tooling changes |

**Examples**:
```
feat(templates): add voice assistant agent template

Adds a new template for building voice-first agents with:
- Speech-to-text preprocessing in perception layer
- Short-response optimization in output format
- Interruption handling in constraint rules

skill(security-audit): improve description for better activation

Previous description was too generic and only activated 60% of the time
in discovery tests. New description includes domain keywords that users
commonly use: 'vulnerability', 'CVE', 'penetration', 'OWASP'.

eval(red-team): add Unicode homoglyph injection probe RT-004

Cyrillic character substitution bypassed prompt injection detection
in some model versions. Added probe and verified guardrail catches it.
```

---

## Pull Request Process

### Before Opening a PR

- [ ] All existing tests pass: `npm test`
- [ ] Linter passes: `npm run lint`
- [ ] Eval runner passes: `python scripts/eval-runner.py --dry-run`
- [ ] Package validator passes: `bash scripts/validate.sh .`
- [ ] CHANGELOG.md updated with your change
- [ ] No new external dependencies added without discussion

### PR Description Template

```markdown
## What does this PR do?

[1-2 sentence summary]

## Why?

[Context and motivation]

## Testing

- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested in Safari
- [ ] New eval scenarios added
- [ ] Existing tests pass

## Screenshots (if UI change)

[Paste before/after screenshots]

## Breaking Changes

[None | Describe what breaks and migration path]
```

### Review Criteria

Reviewers will check:
1. **Security**: Does the change introduce any security regression? Especially watch for: new external requests, localStorage usage, eval() calls, or changes to guardrail logic
2. **Quality**: Does the change follow existing patterns? Is it consistent with the rest of the codebase?
3. **Testing**: Is the change covered by eval scenarios?
4. **Documentation**: Is the change documented in README, CHANGELOG, and/or relevant docs/?
5. **Zero dependencies**: Does the change add any new external dependencies?

---

## Security Vulnerability Reporting

**DO NOT** open a public GitHub issue for security vulnerabilities.

Send details to: security@your-org.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

We will respond within 48 hours and credit you in the CHANGELOG.
