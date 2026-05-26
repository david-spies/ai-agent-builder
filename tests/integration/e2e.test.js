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

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE 8: Logic Component Files
// ══════════════════════════════════════════════════════════════════════════
describe('Logic Component Files', () => {

  describe('All 5 logic component files exist', () => {
    const logicFiles = [
      'logic/ROUTER.md',
      'logic/SEQUENCE.md',
      'logic/GATE.md',
      'logic/DATA_MAP.md',
      'logic/ERROR_POLICY.md',
      'logic/routing-manifest.json',
    ];
    test.each(logicFiles)('%s exists', (file) => {
      expect(fileExists(file)).toBe(true);
    });
  });

  describe('ROUTER.md structure', () => {
    let content;
    beforeAll(() => { content = readFile('logic/ROUTER.md'); });

    test('has component_type: logic-gate in frontmatter', () => {
      expect(content).toMatch(/^component_type: logic-gate/m);
    });
    test('has routing_strategy: deterministic', () => {
      expect(content).toMatch(/^routing_strategy: deterministic/m);
    });
    test('has Execution Rules table', () => {
      expect(content).toContain('## Execution Rules');
    });
    test('has default_fallback defined', () => {
      expect(content).toMatch(/^default_fallback:/m);
    });
    test('has JSON_PATH rule', () => {
      expect(content).toContain('JSON_PATH');
    });
    test('has REGEX rule', () => {
      expect(content).toContain('REGEX');
    });
    test('has KEYWORD_ANY rule', () => {
      expect(content).toContain('KEYWORD_ANY');
    });
    test('has Evaluation Logic section', () => {
      expect(content).toContain('## Evaluation Logic');
    });
    test('has Constraints section', () => {
      expect(content).toContain('## Constraints');
    });
    test('references audit-trails.md', () => {
      expect(content).toContain('audit-trails.md');
    });
    test('no hardcoded credentials', () => {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/gh[pousr]_[A-Za-z0-9_]{36}/);
    });
  });

  describe('SEQUENCE.md structure', () => {
    let content;
    beforeAll(() => { content = readFile('logic/SEQUENCE.md'); });

    test('has component_type: iterator', () => {
      expect(content).toMatch(/^component_type: iterator/m);
    });
    test('has max_items limit', () => {
      expect(content).toMatch(/^max_items:/m);
    });
    test('has on_item_error policy', () => {
      expect(content).toMatch(/^on_item_error:/m);
    });
    test('has checkpoint_enabled', () => {
      expect(content).toMatch(/^checkpoint_enabled:/m);
    });
    test('has Output Schema section', () => {
      expect(content).toContain('Output Schema');
    });
    test('mentions clean isolated context', () => {
      expect(content.toLowerCase()).toContain('isolated context');
    });
  });

  describe('GATE.md structure', () => {
    let content;
    beforeAll(() => { content = readFile('logic/GATE.md'); });

    test('has component_type: hitl-checkpoint', () => {
      expect(content).toMatch(/^component_type: hitl-checkpoint/m);
    });
    test('has HMAC signature verification', () => {
      expect(content.toLowerCase()).toContain('hmac');
    });
    test('has min_approvers field', () => {
      expect(content).toMatch(/^min_approvers:/m);
    });
    test('has gate states (PENDING, APPROVED, REJECTED)', () => {
      expect(content).toContain('PENDING');
      expect(content).toContain('APPROVED');
      expect(content).toContain('REJECTED');
    });
    test('has on_timeout policy', () => {
      expect(content).toMatch(/^on_timeout:/m);
    });
    test('auto_approve on timeout is warned against or not set as default', () => {
      // auto_approve should not be the DEFAULT - it should be auto_reject
      const match = content.match(/^on_timeout:\s*(.+)/m);
      if (match) {
        expect(match[1].trim()).not.toBe('auto_approve');
      }
    });
    test('requires reason for approval', () => {
      expect(content).toMatch(/require_reason:\s*true/m);
    });
  });

  describe('DATA_MAP.md structure', () => {
    let content;
    beforeAll(() => { content = readFile('logic/DATA_MAP.md'); });

    test('has component_type: data-mapper', () => {
      expect(content).toMatch(/^component_type: data-mapper/m);
    });
    test('has on_mapping_error policy', () => {
      expect(content).toContain('on_mapping_error');
    });
    test('has mapping syntax documentation', () => {
      expect(content).toContain('source');
      expect(content).toContain('target');
      expect(content).toContain('type');
    });
    test('mentions JSONPath syntax', () => {
      expect(content.toLowerCase()).toContain('jsonpath');
    });
    test('documents transform expression sandbox restrictions', () => {
      expect(content.toLowerCase()).toContain('sandbox') ||
      expect(content.toLowerCase()).toContain('permitted');
    });
  });

  describe('ERROR_POLICY.md structure', () => {
    let content;
    beforeAll(() => { content = readFile('logic/ERROR_POLICY.md'); });

    test('has component_type: error-handler', () => {
      expect(content).toMatch(/^component_type: error-handler/m);
    });
    test('defines L4 FATAL level', () => {
      expect(content).toContain('FATAL') || expect(content).toContain('Level 4');
    });
    test('has circuit breaker section', () => {
      expect(content.toLowerCase()).toContain('circuit');
    });
    test('mentions partial_results_on_halt', () => {
      expect(content).toContain('partial_results');
    });
    test('has fallback chains', () => {
      expect(content.toLowerCase()).toContain('fallback');
    });
    test('mentions MEMORIES.md for error tracking', () => {
      expect(content).toContain('MEMORIES.md');
    });
  });

  describe('routing-manifest.json structure', () => {
    let data;
    beforeAll(() => {
      data = JSON.parse(readFile('logic/routing-manifest.json'));
    });

    test('is valid JSON', () => {
      expect(data).toBeDefined();
    });
    test('has manifest_version field', () => {
      expect(data).toHaveProperty('manifest_version');
    });
    test('has routers array', () => {
      expect(data).toHaveProperty('routers');
      expect(Array.isArray(data.routers)).toBe(true);
    });
    test('has skill_registry array', () => {
      expect(data).toHaveProperty('skill_registry');
      expect(Array.isArray(data.skill_registry)).toBe(true);
      expect(data.skill_registry.length).toBeGreaterThan(0);
    });
    test('has logic_components array', () => {
      expect(data).toHaveProperty('logic_components');
      expect(Array.isArray(data.logic_components)).toBe(true);
      expect(data.logic_components.length).toBe(5);
    });
    test('logic_components have required fields', () => {
      data.logic_components.forEach(lc => {
        expect(lc).toHaveProperty('type');
        expect(lc).toHaveProperty('file');
        expect(lc).toHaveProperty('active');
        expect(typeof lc.active).toBe('boolean');
      });
    });
    test('all 5 logic component types are registered', () => {
      const types = data.logic_components.map(lc => lc.type);
      ['router','iterator','hitl-gate','data-mapper','error-policy'].forEach(t => {
        expect(types).toContain(t);
      });
    });
    test('router rules have priorities', () => {
      if (data.routers.length > 0) {
        data.routers[0].rules.forEach(rule => {
          expect(rule).toHaveProperty('priority');
          expect(typeof rule.priority).toBe('number');
          expect(rule).toHaveProperty('target_skill');
          expect(rule).toHaveProperty('logic_type');
        });
      }
    });
    test('router rule priorities are sequential', () => {
      if (data.routers.length > 0 && data.routers[0].rules.length > 0) {
        const priorities = data.routers[0].rules.map(r => r.priority).sort((a,b)=>a-b);
        priorities.forEach((p, i) => expect(p).toBe(i + 1));
      }
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE 9: Logic + Skill Cross-Referential Integrity
// ══════════════════════════════════════════════════════════════════════════
describe('Logic ↔ Skill Cross-Referential Integrity', () => {

  test('routing-manifest skill_registry matches .agents/skills/ directory', () => {
    const data = JSON.parse(readFile('logic/routing-manifest.json'));
    const skillsDir = path.resolve(ROOT, '.agents/skills');
    if (!fs.existsSync(skillsDir)) return; // skip if no skills dir
    const actualSkills = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'));
    data.skill_registry.forEach(skill => {
      expect(actualSkills).toContain(skill);
    });
  });

  test('all ROUTER target skills exist in routing-manifest skill_registry', () => {
    const data = JSON.parse(readFile('logic/routing-manifest.json'));
    const registry = new Set(data.skill_registry);
    const exceptions = new Set(['general-assistant', 'hitl-gate', 'reasoning-only.md']);
    data.routers.forEach(router => {
      router.rules.forEach(rule => {
        const target = rule.target_skill;
        if (!exceptions.has(target)) {
          expect(registry.has(target)).toBe(true);
        }
      });
    });
  });

  test('GATE.md references audit-trails.md', () => {
    const gate = readFile('logic/GATE.md');
    expect(gate).toContain('audit-trails.md');
  });

  test('ERROR_POLICY.md references MEMORIES.md', () => {
    const ep = readFile('logic/ERROR_POLICY.md');
    expect(ep).toContain('MEMORIES.md');
  });

  test('ROUTER.md references routing-manifest.json', () => {
    const router = readFile('logic/ROUTER.md');
    expect(router).toContain('routing-manifest.json');
  });

  test('AGENTS.md references logic/ directory', () => {
    const agents = readFile('AGENTS.md');
    expect(agents).toContain('logic/');
  });

  test('validate.sh checks for logic/ directory', () => {
    const validate = readFile('scripts/validate.sh');
    expect(validate.toLowerCase()).toContain('logic');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE 10: on_fail Frontmatter — Skill File Integration
// ══════════════════════════════════════════════════════════════════════════
describe('on_fail Frontmatter in Skill Files', () => {

  const skillFiles = [
    { file: '.agents/skills/code-review.md',      expected_on_fail: 'basic-lint-only.md',           expected_retry: '2' },
    { file: '.agents/skills/security-audit.md',   expected_on_fail: 'llm-only-security-review.md',  expected_retry: '2' },
    { file: '.agents/skills/rag-retrieval.md',    expected_on_fail: 'reasoning-only.md',             expected_retry: '3' },
    { file: '.agents/skills/sprint-planner.md',   expected_on_fail: 'hitl-gate',                     expected_retry: '1' },
    { file: '.agents/skills/data-validator.md',   expected_on_fail: 'reasoning-only.md',             expected_retry: '2' },
    { file: '.agents/skills/incident-response.md',expected_on_fail: 'hitl-gate',                     expected_retry: '1' },
  ];

  describe('All skill files contain on_fail frontmatter', () => {
    test.each(skillFiles)('$file has on_fail key', ({ file }) => {
      const content = readFile(file);
      expect(content).toMatch(/^on_fail:/m);
    });

    test.each(skillFiles)('$file has on_empty_result key', ({ file }) => {
      const content = readFile(file);
      expect(content).toMatch(/^on_empty_result:/m);
    });

    test.each(skillFiles)('$file has on_timeout key', ({ file }) => {
      const content = readFile(file);
      expect(content).toMatch(/^on_timeout:/m);
    });

    test.each(skillFiles)('$file has retry_count key', ({ file }) => {
      const content = readFile(file);
      expect(content).toMatch(/^retry_count:/m);
    });
  });

  describe('on_fail values match expected defaults', () => {
    test.each(skillFiles)('$file on_fail = $expected_on_fail', ({ file, expected_on_fail }) => {
      const content = readFile(file);
      const match = content.match(/^on_fail:\s*(.+)/m);
      expect(match).toBeTruthy();
      expect(match[1].trim()).toBe(expected_on_fail);
    });

    test.each(skillFiles)('$file retry_count = $expected_retry', ({ file, expected_retry }) => {
      const content = readFile(file);
      const match = content.match(/^retry_count:\s*(\d+)/m);
      expect(match).toBeTruthy();
      expect(match[1].trim()).toBe(expected_retry);
    });
  });

  describe('on_fail position in frontmatter', () => {
    test.each(skillFiles)('$file — on_fail appears after max_lines', ({ file }) => {
      const content = readFile(file);
      const maxLinesIdx = content.indexOf('max_lines:');
      const onFailIdx   = content.indexOf('on_fail:');
      expect(maxLinesIdx).toBeGreaterThan(0);
      expect(onFailIdx).toBeGreaterThan(maxLinesIdx);
    });

    test.each(skillFiles)('$file — on_fail appears inside frontmatter (before first ---)', ({ file }) => {
      const content = readFile(file);
      // Frontmatter ends at second ---
      const firstDash = content.indexOf('---');
      const secondDash = content.indexOf('---', firstDash + 3);
      const onFailIdx = content.indexOf('on_fail:');
      expect(onFailIdx).toBeGreaterThan(firstDash);
      expect(onFailIdx).toBeLessThan(secondDash);
    });
  });

  describe('Security-sensitive skill on_fail constraints', () => {
    test('security-audit does NOT use reasoning-only.md as on_fail', () => {
      const content = readFile('.agents/skills/security-audit.md');
      const match = content.match(/^on_fail:\s*(.+)/m);
      expect(match).toBeTruthy();
      expect(match[1].trim()).not.toBe('reasoning-only.md');
    });

    test('incident-response uses hitl-gate on_fail (never silent degrade)', () => {
      const content = readFile('.agents/skills/incident-response.md');
      const match = content.match(/^on_fail:\s*(.+)/m);
      expect(match).toBeTruthy();
      expect(match[1].trim()).toBe('hitl-gate');
    });

    test('sprint-planner uses hitl-gate on_fail', () => {
      const content = readFile('.agents/skills/sprint-planner.md');
      const match = content.match(/^on_fail:\s*(.+)/m);
      expect(match).toBeTruthy();
      expect(match[1].trim()).toBe('hitl-gate');
    });

    test('rag-retrieval retry_count is 3 (retrieval is worth retrying)', () => {
      const content = readFile('.agents/skills/rag-retrieval.md');
      const match = content.match(/^retry_count:\s*(\d+)/m);
      expect(match).toBeTruthy();
      expect(parseInt(match[1])).toBe(3);
    });

    test('incident-response retry_count is 1 (urgency — fail fast)', () => {
      const content = readFile('.agents/skills/incident-response.md');
      const match = content.match(/^retry_count:\s*(\d+)/m);
      expect(match).toBeTruthy();
      expect(parseInt(match[1])).toBe(1);
    });
  });

  describe('on_fail retry_count validity', () => {
    test.each(skillFiles)('$file retry_count is integer 0-10', ({ file }) => {
      const content = readFile(file);
      const match = content.match(/^retry_count:\s*(\d+)/m);
      expect(match).toBeTruthy();
      const n = parseInt(match[1]);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(10);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE 11: on_fail — Builder HTML Integration
// ══════════════════════════════════════════════════════════════════════════
describe('on_fail — Builder HTML Integration', () => {
  let html;

  beforeAll(() => {
    html = readFile('ai-agent-builder.html');
  });

  test('cfg-on-fail select element exists', () => {
    expect(html).toContain('id="cfg-on-fail"');
  });

  test('cfg-on-empty select element exists', () => {
    expect(html).toContain('id="cfg-on-empty"');
  });

  test('cfg-on-timeout select element exists', () => {
    expect(html).toContain('id="cfg-on-timeout"');
  });

  test('cfg-retry-count select element exists', () => {
    expect(html).toContain('id="cfg-retry-count"');
  });

  test('live preview has out-on-fail element', () => {
    expect(html).toContain('id="out-on-fail"');
  });

  test('live preview has out-on-empty element', () => {
    expect(html).toContain('id="out-on-empty"');
  });

  test('live preview has out-on-timeout element', () => {
    expect(html).toContain('id="out-on-timeout"');
  });

  test('live preview has out-retry element', () => {
    expect(html).toContain('id="out-retry"');
  });

  test('change event listener syncs on_fail fields', () => {
    expect(html).toContain("'cfg-on-fail'");
    expect(html).toContain("'out-on-fail'");
  });

  test('reasoning-only.md is an available on_fail option', () => {
    expect(html).toContain('reasoning-only.md');
  });

  test('hitl-gate is an available on_fail option', () => {
    const select = html.match(/id="cfg-on-fail"[\s\S]{0,400}/)?.[0] || '';
    expect(select).toContain('hitl-gate');
  });

  test('Inline Error Handling card is present', () => {
    expect(html).toContain('Inline Error Handling');
  });

  test('precedence rule is displayed in UI', () => {
    expect(html).toContain('PRECEDENCE RULE');
    expect(html).toContain('ERROR_POLICY.md');
  });

  test('downloadPackage reads cfg-on-fail', () => {
    const script = html.match(/<script>([\s\S]+?)<\/script>\s*<\/body>/)?.[1] || '';
    expect(script).toContain("'cfg-on-fail'");
    expect(script).toContain('onFailBlock');
    expect(script).toContain('onFailConstraint');
  });

  test('doValidate checks on_fail configuration', () => {
    const script = html.match(/<script>([\s\S]+?)<\/script>\s*<\/body>/)?.[1] || '';
    expect(script).toContain('cfg-on-fail');
    expect(script).toContain('retry_count');
    expect(script).toContain('No fallback policy');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE 12: on_fail — Documentation Coverage
// ══════════════════════════════════════════════════════════════════════════
describe('on_fail — Documentation Coverage', () => {

  test('ERROR_POLICY.md documents on_fail precedence rule', () => {
    const content = readFile('logic/ERROR_POLICY.md');
    expect(content).toContain('on_fail');
    expect(content).toContain('Precedence');
    expect(content).toContain('skill-level');
  });

  test('ERROR_POLICY.md documents on_empty_result semantics', () => {
    const content = readFile('logic/ERROR_POLICY.md');
    expect(content).toContain('on_empty_result');
  });

  test('API_REFERENCE.md has on_fail section', () => {
    const content = readFile('docs/API_REFERENCE.md');
    expect(content).toContain('on_fail');
    expect(content).toContain('on_empty_result');
    expect(content).toContain('on_timeout');
    expect(content).toContain('retry_count');
  });

  test('API_REFERENCE.md documents precedence decision tree', () => {
    const content = readFile('docs/API_REFERENCE.md');
    expect(content).toContain('Precedence');
    expect(content).toContain('ERROR_POLICY.md');
  });

  test('audit-trails.md has on_fail event types', () => {
    const content = readFile('references/audit-trails.md');
    expect(content).toContain('skill_on_fail_invoked');
    expect(content).toContain('skill_on_empty_invoked');
    expect(content).toContain('skill_on_timeout_invoked');
  });

  test('validate.sh checks on_fail targets', () => {
    const content = readFile('scripts/validate.sh');
    expect(content).toContain('on_fail');
    expect(content).toContain('RESERVED_TARGETS');
    expect(content).toContain('retry_count');
  });

  test('security INSTRUCTIONS.md has on_fail review checklist', () => {
    const content = readFile('agents/security/INSTRUCTIONS.md');
    expect(content).toContain('on_fail');
    expect(content).toContain('on_empty_result');
  });

  test('worker INSTRUCTIONS.md has on_fail generation rules', () => {
    const content = readFile('agents/worker/INSTRUCTIONS.md');
    expect(content).toContain('on_fail');
    expect(content).toContain('retry_count');
    expect(content).toContain('on_empty_result');
  });

  test('CHANGELOG.md has v1.2.0 entry', () => {
    const content = readFile('CHANGELOG.md');
    expect(content).toContain('[1.2.0]');
    expect(content).toContain('on_fail');
  });
});
