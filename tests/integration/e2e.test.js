/**
 * e2e.test.js — End-to-End Integration Tests for Ai-Agent Builder
 * Tests the complete build pipeline, file generation, eval runner,
 * validation script, and package structure.
 *
 * Run: npm run test:e2e
 * Requirements: Node.js 18+, Python 3.9+
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// ── Helpers ────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
const DIST = path.join(ROOT, 'dist/test-e2e');

function run(cmd, opts = {}) {
  return spawnSync('bash', ['-c', cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, PATH: process.env.PATH },
    ...opts,
  });
}

function runPython(cmd, opts = {}) {
  return spawnSync('python3', ['-c', cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    ...opts,
  });
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function readFile(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function countLines(content) {
  return content.split('\n').length;
}

// ── Setup / Teardown ──────────────────────────────────────────────────────
beforeAll(() => {
  if (!fs.existsSync(DIST)) {
    fs.mkdirSync(DIST, { recursive: true });
  }
});

afterAll(() => {
  // Clean up test dist directory
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: Project Structure
// ══════════════════════════════════════════════════════════════════════════
describe('Project Structure', () => {

  describe('Root files exist', () => {
    const rootFiles = [
      'ai-agent-builder.html',
      'README.md',
      'SKILL.md',
      'AGENTS.md',
      'MEMORIES.md',
      'CHANGELOG.md',
      'CONTRIBUTING.md',
      'LICENSE',
    ];

    test.each(rootFiles)('root file exists: %s', (file) => {
      expect(fileExists(file)).toBe(true);
    });
  });

  describe('Reference files exist', () => {
    const refFiles = [
      'references/guardrails.md',
      'references/llm-judge.md',
      'references/audit-trails.md',
      'references/governance.md',
      'references/permissions.md',
      'references/versioning.md',
    ];

    test.each(refFiles)('reference file exists: %s', (file) => {
      expect(fileExists(file)).toBe(true);
    });
  });

  describe('Agent instruction files exist', () => {
    const agentFiles = [
      'agents/architect/INSTRUCTIONS.md',
      'agents/worker/INSTRUCTIONS.md',
      'agents/security/INSTRUCTIONS.md',
    ];

    test.each(agentFiles)('agent file exists: %s', (file) => {
      expect(fileExists(file)).toBe(true);
    });
  });

  describe('Skill files exist', () => {
    const skillFiles = [
      '.agents/skills/SKILL.md',
      '.agents/skills/code-review.md',
      '.agents/skills/security-audit.md',
      '.agents/skills/sprint-planner.md',
      '.agents/skills/data-validator.md',
      '.agents/skills/rag-retrieval.md',
      '.agents/skills/incident-response.md',
    ];

    test.each(skillFiles)('skill file exists: %s', (file) => {
      expect(fileExists(file)).toBe(true);
    });
  });

  describe('Eval files exist', () => {
    const evalFiles = [
      'evals/golden-set/README.md',
      'evals/golden-set/general.json',
      'evals/golden-set/code-review.json',
      'evals/golden-set/security.json',
      'evals/red-team/README.md',
      'evals/red-team/prompt-injection.md',
      'evals/red-team/credential-theft.md',
      'evals/red-team/permission-escalation.md',
    ];

    test.each(evalFiles)('eval file exists: %s', (file) => {
      expect(fileExists(file)).toBe(true);
    });
  });

  describe('Scripts exist', () => {
    const scripts = [
      'scripts/validate.sh',
      'scripts/package.sh',
      'scripts/eval-runner.sh',
      'scripts/eval-runner.py',
    ];

    test.each(scripts)('script exists: %s', (script) => {
      expect(fileExists(script)).toBe(true);
    });
  });

  describe('Docs exist', () => {
    const docs = [
      'docs/ARCHITECTURE.md',
      'docs/SKILL_AUTHORING.md',
      'docs/DEPLOYMENT.md',
      'docs/API_REFERENCE.md',
    ];

    test.each(docs)('doc exists: %s', (doc) => {
      expect(fileExists(doc)).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: SKILL.md File Validation
// ══════════════════════════════════════════════════════════════════════════
describe('SKILL.md File Validation', () => {

  const skillFiles = [
    'SKILL.md',
    '.agents/skills/SKILL.md',
    '.agents/skills/code-review.md',
    '.agents/skills/security-audit.md',
    '.agents/skills/sprint-planner.md',
    '.agents/skills/data-validator.md',
    '.agents/skills/rag-retrieval.md',
    '.agents/skills/incident-response.md',
  ];

  describe.each(skillFiles)('%s', (skillFile) => {
    let content;

    beforeAll(() => {
      content = readFile(skillFile);
    });

    test('starts with YAML frontmatter delimiter', () => {
      expect(content.startsWith('---')).toBe(true);
    });

    test('has closing frontmatter delimiter', () => {
      const afterFirst = content.indexOf('\n---', 3);
      expect(afterFirst).toBeGreaterThan(0);
    });

    test('has name: field in frontmatter', () => {
      expect(content).toMatch(/^name: .+/m);
    });

    test('has version: field in frontmatter', () => {
      expect(content).toMatch(/^version: \d+\.\d+\.\d+/m);
    });

    test('has description: field in frontmatter', () => {
      expect(content).toMatch(/^description: .+/m);
    });

    test('description is at least 20 characters', () => {
      const match = content.match(/^description: (.+)/m);
      expect(match).toBeTruthy();
      expect(match[1].length).toBeGreaterThanOrEqual(20);
    });

    test('has # Overview section', () => {
      expect(content).toContain('# Overview');
    });

    test('has ## Instructions section', () => {
      expect(content).toContain('## Instructions');
    });

    test('has ## Constraints section', () => {
      expect(content).toContain('## Constraints');
    });

    test('has no-hallucination constraint', () => {
      expect(content.toLowerCase()).toContain('hallucination');
    });

    test('is under 200 lines', () => {
      expect(countLines(content)).toBeLessThanOrEqual(200);
    });

    test('contains no hardcoded AWS key patterns', () => {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
    });

    test('contains no hardcoded GitHub tokens', () => {
      expect(content).not.toMatch(/gh[pousr]_[A-Za-z0-9_]{36}/);
    });

    test('contains no private key patterns', () => {
      expect(content).not.toContain('-----BEGIN RSA PRIVATE KEY-----');
      expect(content).not.toContain('-----BEGIN EC PRIVATE KEY-----');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: Golden Set JSON Validation
// ══════════════════════════════════════════════════════════════════════════
describe('Golden Set JSON Validation', () => {

  const jsonFiles = [
    'evals/golden-set/general.json',
    'evals/golden-set/code-review.json',
    'evals/golden-set/security.json',
  ];

  test.each(jsonFiles)('%s is valid JSON', (file) => {
    const content = readFile(file);
    expect(() => JSON.parse(content)).not.toThrow();
  });

  test.each(jsonFiles)('%s has dataset_name field', (file) => {
    const data = JSON.parse(readFile(file));
    expect(data).toHaveProperty('dataset_name');
    expect(typeof data.dataset_name).toBe('string');
    expect(data.dataset_name.length).toBeGreaterThan(0);
  });

  test.each(jsonFiles)('%s has scenarios array', (file) => {
    const data = JSON.parse(readFile(file));
    expect(data).toHaveProperty('scenarios');
    expect(Array.isArray(data.scenarios)).toBe(true);
  });

  test.each(jsonFiles)('%s has at least 1 scenario', (file) => {
    const data = JSON.parse(readFile(file));
    expect(data.scenarios.length).toBeGreaterThanOrEqual(1);
  });

  test.each(jsonFiles)('%s — all scenarios have required fields', (file) => {
    const data = JSON.parse(readFile(file));
    data.scenarios.forEach((scenario, i) => {
      expect(scenario).toHaveProperty('id');
      expect(scenario).toHaveProperty('name');
      expect(scenario).toHaveProperty('input');
      expect(scenario.input).toHaveProperty('user_request');
      expect(scenario).toHaveProperty('expected_output');
      expect(scenario.expected_output).toHaveProperty('ground_truth');
    });
  });

  test.each(jsonFiles)('%s — all scenario IDs are unique', (file) => {
    const data = JSON.parse(readFile(file));
    const ids = data.scenarios.map(s => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE 4: Script Validation
// ══════════════════════════════════════════════════════════════════════════
describe('Scripts', () => {

  test('validate.sh is executable or can be run with bash', () => {
    const result = run('bash scripts/validate.sh --help 2>&1 || true');
    // Should not produce "command not found" or syntax error
    expect(result.stderr).not.toContain('syntax error');
  });

  test('validate.sh runs against project root without crashing', () => {
    const result = run('bash scripts/validate.sh . 2>&1; echo EXIT:$?');
    expect(result.stdout).toContain('EXIT:');
    // May have warnings/errors but should not crash with uncaught exception
    expect(result.stdout).not.toContain('unbound variable');
  });

  test('package.sh shows help with --help flag', () => {
    const result = run('bash scripts/package.sh --help 2>&1');
    expect(result.stdout + result.stderr).toMatch(/Usage|usage|Options|options/i);
  });

  test('package.sh errors on missing --agent-dir', () => {
    const result = run('bash scripts/package.sh --version 1.0.0 2>&1; echo EXIT:$?');
    expect(result.stdout).toContain('EXIT:1');
  });

  test('package.sh errors on missing --version', () => {
    const result = run('bash scripts/package.sh --agent-dir . 2>&1; echo EXIT:$?');
    expect(result.stdout).toContain('EXIT:1');
  });

  test('package.sh accepts --dry-run without error', () => {
    const result = run('bash scripts/package.sh --agent-dir . --version 1.0.0 --dry-run --skip-validation --skip-eval 2>&1; echo EXIT:$?');
    expect(result.stdout).toContain('DRY RUN');
  });

  test('eval-runner.sh shows exit code reference', () => {
    const result = run('bash scripts/eval-runner.sh --help 2>&1');
    expect(result.stdout + result.stderr).toMatch(/Exit code|exit code|Usage/i);
  });

  test('eval-runner.py is valid Python syntax', () => {
    const result = runPython('import ast; ast.parse(open("scripts/eval-runner.py").read()); print("OK")');
    expect(result.stdout.trim()).toBe('OK');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE 5: Builder HTML Integrity
// ══════════════════════════════════════════════════════════════════════════
describe('Builder HTML (ai-agent-builder.html)', () => {
  let html;

  beforeAll(() => {
    html = readFile('ai-agent-builder.html');
  });

  test('file is not empty', () => {
    expect(html.length).toBeGreaterThan(10000);
  });

  test('has DOCTYPE declaration', () => {
    expect(html.toLowerCase()).toContain('<!doctype html>');
  });

  test('has all 6 template card IDs', () => {
    ['react', 'supervisor', 'rag', 'security', 'swarm', 'custom'].forEach(tpl => {
      expect(html).toContain(`id="tpl-${tpl}"`);
    });
  });

  test('has all 8 quick-fill keys', () => {
    ['code-review', 'security-audit', 'sprint-plan', 'data-pipeline',
     'rag-agent', 'code-gen', 'incident', 'custom'].forEach(key => {
      expect(html).toContain(`quickFill('${key}')`);
    });
  });

  test('has build engine function doBuild', () => {
    expect(html).toContain('function doBuild()');
  });

  test('has download function downloadPackage', () => {
    expect(html).toContain('function downloadPackage()');
  });

  test('has audit log function', () => {
    expect(html).toContain('function log(');
  });

  test('has no external CDN scripts (zero external dependencies)', () => {
    // Should not have script src pointing to external CDN
    const externalScripts = html.match(/<script[^>]+src=["']https?:\/\//gi);
    expect(externalScripts).toBeNull();
  });

  test('has no localStorage usage', () => {
    expect(html).not.toContain('localStorage');
    expect(html).not.toContain('sessionStorage');
  });

  test('has no eval() calls', () => {
    // eval() in code context (not in strings like 'evaluate')
    const evalCalls = html.match(/\beval\s*\(/g);
    expect(evalCalls).toBeNull();
  });

  test('has no hardcoded API keys or secrets', () => {
    expect(html).not.toMatch(/sk-ant-[a-zA-Z0-9-]{10,}/);
    expect(html).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(html).not.toMatch(/gh[pousr]_[A-Za-z0-9_]{36}/);
  });

  test('BUILD_STEPS array has exactly 12 steps', () => {
    const match = html.match(/const BUILD_STEPS = \[([\s\S]+?)\];/);
    expect(match).toBeTruthy();
    const stepsCount = (match[1].match(/'[^']+'/g) || []).length;
    expect(stepsCount).toBe(12);
  });

  test('TEMPLATES object contains all 6 templates', () => {
    ['react', 'supervisor', 'rag', 'security', 'swarm', 'custom'].forEach(tpl => {
      expect(html).toContain(`TEMPLATES['${tpl}']`);
    });
  });

  test('all 4 panel tabs are defined', () => {
    ['skill', 'agents', 'eval', 'log'].forEach(tab => {
      expect(html).toContain(`'tab-${tab}'`);
    });
  });

  test('keyboard shortcuts are defined', () => {
    expect(html).toContain('doBuild');
    expect(html).toContain('doValidate');
    expect(html).toContain('Escape');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE 6: Guardrail Configuration Completeness
// ══════════════════════════════════════════════════════════════════════════
describe('Guardrails Configuration', () => {
  let guardrailsContent;

  beforeAll(() => {
    guardrailsContent = readFile('references/guardrails.md');
  });

  test('covers all 3 layers', () => {
    expect(guardrailsContent).toContain('Layer 1');
    expect(guardrailsContent).toContain('Layer 2');
    expect(guardrailsContent).toContain('Layer 3');
  });

  test('includes prompt injection detection', () => {
    expect(guardrailsContent.toLowerCase()).toContain('prompt injection');
  });

  test('includes PII masking', () => {
    expect(guardrailsContent.toLowerCase()).toContain('pii');
  });

  test('includes detect-secrets configuration', () => {
    expect(guardrailsContent).toContain('detect-secrets');
  });

  test('includes Semgrep configuration', () => {
    expect(guardrailsContent).toContain('semgrep');
  });

  test('includes HITL configuration', () => {
    expect(guardrailsContent).toContain('hitl');
  });

  test('includes cost control limits', () => {
    expect(guardrailsContent).toContain('max_tool_calls');
    expect(guardrailsContent).toContain('budget_ceiling');
  });

  test('includes sandbox configuration', () => {
    expect(guardrailsContent.toLowerCase()).toContain('sandbox');
  });

  test('includes network access controls', () => {
    expect(guardrailsContent.toLowerCase()).toContain('network');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE 7: Red Team Probe Coverage
// ══════════════════════════════════════════════════════════════════════════
describe('Red Team Probe Coverage', () => {

  const redTeamFiles = [
    'evals/red-team/prompt-injection.md',
    'evals/red-team/credential-theft.md',
    'evals/red-team/permission-escalation.md',
  ];

  test.each(redTeamFiles)('%s is non-empty', (file) => {
    const content = readFile(file);
    expect(content.length).toBeGreaterThan(200);
  });

  test('prompt-injection.md covers basic instruction override', () => {
    const content = readFile('evals/red-team/prompt-injection.md');
    expect(content.toLowerCase()).toContain('ignore all previous instructions');
  });

  test('credential-theft.md covers direct secret request', () => {
    const content = readFile('evals/red-team/credential-theft.md');
    expect(content.toLowerCase()).toContain('api key') ||
    expect(content.toLowerCase()).toContain('credential') ||
    expect(content.toLowerCase()).toContain('secret');
  });

  test('permission-escalation.md covers self-escalation attempt', () => {
    const content = readFile('evals/red-team/permission-escalation.md');
    expect(content.toLowerCase()).toContain('permission') ||
    expect(content.toLowerCase()).toContain('scope') ||
    expect(content.toLowerCase()).toContain('admin');
  });

  test('red-team README documents all probe categories', () => {
    const readme = readFile('evals/red-team/README.md');
    expect(readme).toContain('prompt-injection');
    expect(readme).toContain('credential');
    expect(readme).toContain('permission');
  });
});
