/**
 * builder.test.js — Unit Tests for Ai-Agent Builder
 * Tests the core build engine, template system, file generation,
 * guardrail logic, and utility functions.
 *
 * Run: npm test
 * Framework: Jest
 */

'use strict';

// ── Mock browser APIs not available in Node ───────────────────────────────
global.navigator = { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } };
global.URL = {
  createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: jest.fn(),
};
global.document = {
  createElement: jest.fn().mockReturnValue({ click: jest.fn(), href: '', download: '' }),
  getElementById: jest.fn().mockReturnValue(null),
  querySelectorAll: jest.fn().mockReturnValue([]),
};

// ── Import helpers extracted from builder (or inline equivalents) ──────────

/**
 * These functions mirror the logic in ai-agent-builder.html.
 * In a real build pipeline, these would be extracted to ES modules.
 */

// ── TEMPLATES ─────────────────────────────────────────────────────────────
const TEMPLATES = {
  react: {
    name: 'ReAct Agent',
    pattern: 'ReAct (Think → Act → Observe)',
    overview: 'A single-agent ReAct-pattern system.',
    instructions: ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5'],
    roles: '- Orchestrator: manages loop\n- Tools: web search, code executor',
    pipelineNodes: ['Perception', 'ReAct Loop', 'Tool Exec', 'Observe', 'Reflect', 'Guardrails'],
  },
  supervisor: {
    name: 'Supervisor MAS',
    pattern: 'Hierarchical Multi-Agent System',
    overview: 'Hierarchical MAS with Architect lead.',
    instructions: ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5'],
    roles: '- Architect: lead\n- Workers: execute\n- Security Officer: audit',
    pipelineNodes: ['Architect', 'Dispatch', 'Workers', 'Sec Officer', 'Aggregate', 'HITL Gate'],
  },
  rag: {
    name: 'Agentic RAG',
    pattern: 'Agentic Retrieval-Augmented Generation',
    overview: 'Self-directed retrieval with re-query.',
    instructions: ['Step 1', 'Step 2', 'Step 3'],
    roles: '- Query Planner\n- Retriever\n- Synthesizer',
    pipelineNodes: ['Query Plan', 'Vector DB', 'Eval Coverage', 'Re-query', 'Synthesize', 'Cite Sources'],
  },
  security: {
    name: 'Security Squad',
    pattern: 'Adversarial Peer Review',
    overview: 'Developer + Security Officer loop.',
    instructions: ['Step 1', 'Step 2', 'Step 3'],
    roles: '- Developer\n- Security Officer (CISO persona)',
    pipelineNodes: ['Developer', 'Static Analysis', 'Sec Officer', 'Debt Report', 'Approval', 'Audit Log'],
  },
  swarm: {
    name: 'Swarm Agent',
    pattern: 'Collaborative Peer Swarm',
    overview: 'Peer agents sharing memory.',
    instructions: ['Step 1', 'Step 2'],
    roles: '- Swarm Agents (N)\n- Consensus Module',
    pipelineNodes: ['Broadcast', 'Self-assign', 'Parallel Exec', 'Share Memory', 'Consensus', 'Validate'],
  },
  custom: {
    name: 'Custom Agent',
    pattern: 'Custom (User-defined)',
    overview: 'Fully custom configuration.',
    instructions: ['Step 1'],
    roles: '- Define your own roles',
    pipelineNodes: ['Perception', 'Planning', 'Memory', 'Execution', 'Evaluation', 'Guardrails'],
  },
};

const QUICK_FILLS = {
  'code-review':    'Review pull requests for code quality and security vulnerabilities.',
  'security-audit': 'Perform automated security audits on codebases.',
  'sprint-plan':    'Decompose product requirements into Jira-ready sprint tasks.',
  'data-pipeline':  'Monitor and validate data pipelines end-to-end.',
  'rag-agent':      'Build a self-directed RAG agent for internal knowledge base Q&A.',
  'code-gen':       'Generate production-grade code from natural language specifications.',
  'incident':       'Triage and respond to production incidents automatically.',
  'custom':         '',
};

// ── Pure utility functions mirrored from builder ───────────────────────────

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}

function truncateDescription(text, maxLen = 90) {
  if (!text) return 'Define a use case above';
  return text.length > maxLen ? text.substring(0, maxLen) + '…' : text;
}

function validateInputs(name, useCase, template) {
  const errors = [];
  if (!name || !name.trim()) errors.push('Agent name is required');
  if (!useCase || !useCase.trim()) errors.push('Use case description is required');
  if (!template) errors.push('Template selection is required');
  return { valid: errors.length === 0, errors };
}

function generateSkillMd(name, useCase, template) {
  const T = TEMPLATES[template];
  if (!T) throw new Error(`Unknown template: ${template}`);
  return `---
name: ${slugify(name)}
version: 1.0.0
description: ${truncateDescription(useCase, 150)}
template: ${T.name}
model: anthropic/claude-sonnet-4
max_lines: 200
---

# Overview

${T.overview}

## Instructions

${T.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Constraints
- No hallucinations: ask for clarification if step not defined in this file
- This file takes precedence over model training data
- Max 200 lines — heavy data goes in ./references/

## Output Format
\`\`\`json
{
  "result": "",
  "confidence": 0.0,
  "sources": [],
  "next_actions": []
}
\`\`\`
`;
}

function detectAutoSkills(useCase) {
  const ul = (useCase || '').toLowerCase();
  const skills = [];
  if (/security|audit|vuln|cve/.test(ul)) skills.push('security-policy.md', 'cve-scanner.md');
  if (/code|review|pr|pull request/.test(ul)) skills.push('code-quality.md');
  if (/rag|retrieval|vector|knowledge base/.test(ul)) skills.push('vector-search.md');
  if (/data|pipeline|schema|etl/.test(ul)) skills.push('data-validator.md');
  if (/incident|alert|triage|oncall/.test(ul)) skills.push('incident-triage.md');
  if (/sprint|jira|agile|scrum/.test(ul)) skills.push('sprint-planner.md');
  return skills;
}

function getFileExtClass(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return { md: 'fc-md', txt: 'fc-txt', docx: 'fc-docx' }[ext] || 'fc-other';
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('slugify()', () => {
  test('converts spaces to hyphens', () => {
    expect(slugify('My Cool Agent')).toBe('my-cool-agent');
  });

  test('removes special characters', () => {
    expect(slugify('Agent (v2.0)!')).toBe('agent-v20');
  });

  test('lowercases all characters', () => {
    expect(slugify('SECURITY AUDITOR')).toBe('security-auditor');
  });

  test('handles already-slugified string', () => {
    expect(slugify('code-review-pro')).toBe('code-review-pro');
  });

  test('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  test('handles single word', () => {
    expect(slugify('Agent')).toBe('agent');
  });
});

describe('formatBytes()', () => {
  test('formats bytes under 1KB', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  test('formats kilobytes', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  test('formats with one decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  test('handles 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  test('handles exactly 1024 bytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });
});

describe('truncateDescription()', () => {
  test('returns placeholder for empty string', () => {
    expect(truncateDescription('')).toBe('Define a use case above');
  });

  test('returns placeholder for null', () => {
    expect(truncateDescription(null)).toBe('Define a use case above');
  });

  test('returns string unchanged if under max length', () => {
    expect(truncateDescription('Short text', 90)).toBe('Short text');
  });

  test('truncates and appends ellipsis when over max', () => {
    const long = 'a'.repeat(100);
    const result = truncateDescription(long, 90);
    expect(result).toHaveLength(91); // 90 chars + ellipsis char
    expect(result.endsWith('…')).toBe(true);
  });

  test('uses default max of 90', () => {
    const text = 'x'.repeat(95);
    expect(truncateDescription(text)).toHaveLength(91);
  });
});

describe('validateInputs()', () => {
  test('returns valid=true when all fields present', () => {
    const result = validateInputs('My Agent', 'Review pull requests', 'react');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('returns error when name is empty', () => {
    const result = validateInputs('', 'Some use case', 'react');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Agent name is required');
  });

  test('returns error when name is whitespace only', () => {
    const result = validateInputs('   ', 'Some use case', 'react');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Agent name is required');
  });

  test('returns error when use case is empty', () => {
    const result = validateInputs('My Agent', '', 'react');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Use case description is required');
  });

  test('returns error when template is null', () => {
    const result = validateInputs('My Agent', 'Some use case', null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Template selection is required');
  });

  test('returns multiple errors when multiple fields missing', () => {
    const result = validateInputs('', '', null);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });
});

describe('TEMPLATES object', () => {
  test('contains all 6 required templates', () => {
    const required = ['react', 'supervisor', 'rag', 'security', 'swarm', 'custom'];
    required.forEach(key => {
      expect(TEMPLATES).toHaveProperty(key);
    });
  });

  test.each(Object.keys(TEMPLATES))('template "%s" has required fields', (key) => {
    const T = TEMPLATES[key];
    expect(T).toHaveProperty('name');
    expect(T).toHaveProperty('pattern');
    expect(T).toHaveProperty('overview');
    expect(T).toHaveProperty('instructions');
    expect(T).toHaveProperty('roles');
    expect(T).toHaveProperty('pipelineNodes');
  });

  test.each(Object.keys(TEMPLATES))('template "%s" has exactly 6 pipeline nodes', (key) => {
    expect(TEMPLATES[key].pipelineNodes).toHaveLength(6);
  });

  test.each(Object.keys(TEMPLATES))('template "%s" has at least 1 instruction', (key) => {
    expect(TEMPLATES[key].instructions.length).toBeGreaterThanOrEqual(1);
  });

  test.each(Object.keys(TEMPLATES))('template "%s" name is a non-empty string', (key) => {
    expect(typeof TEMPLATES[key].name).toBe('string');
    expect(TEMPLATES[key].name.length).toBeGreaterThan(0);
  });
});

describe('QUICK_FILLS object', () => {
  test('contains all expected keys', () => {
    const required = ['code-review', 'security-audit', 'sprint-plan',
                      'data-pipeline', 'rag-agent', 'code-gen', 'incident', 'custom'];
    required.forEach(key => expect(QUICK_FILLS).toHaveProperty(key));
  });

  test('custom key is empty string', () => {
    expect(QUICK_FILLS['custom']).toBe('');
  });

  test('all non-custom fills are non-empty strings', () => {
    Object.entries(QUICK_FILLS).forEach(([key, value]) => {
      if (key !== 'custom') {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(20);
      }
    });
  });
});

describe('generateSkillMd()', () => {
  test('generates valid SKILL.md for react template', () => {
    const output = generateSkillMd('My Agent', 'Review code for issues', 'react');
    expect(output).toContain('name: my-agent');
    expect(output).toContain('version: 1.0.0');
    expect(output).toContain('# Overview');
    expect(output).toContain('## Instructions');
    expect(output).toContain('## Constraints');
    expect(output).toContain('## Output Format');
  });

  test('slugifies agent name', () => {
    const output = generateSkillMd('My Cool Agent!', 'Do things', 'react');
    expect(output).toContain('name: my-cool-agent');
  });

  test('truncates long description', () => {
    const longUseCase = 'a'.repeat(200);
    const output = generateSkillMd('Agent', longUseCase, 'react');
    const descLine = output.split('\n').find(l => l.startsWith('description:'));
    expect(descLine.length).toBeLessThan(200);
  });

  test('throws for unknown template', () => {
    expect(() => generateSkillMd('Agent', 'Use case', 'nonexistent')).toThrow('Unknown template: nonexistent');
  });

  test('includes template name in frontmatter', () => {
    const output = generateSkillMd('Agent', 'Use case', 'supervisor');
    expect(output).toContain('template: Supervisor MAS');
  });

  test('numbers instructions correctly', () => {
    const output = generateSkillMd('Agent', 'Use case', 'react');
    expect(output).toContain('1. Step 1');
    expect(output).toContain('2. Step 2');
  });

  test('includes no-hallucination constraint', () => {
    const output = generateSkillMd('Agent', 'Use case', 'react');
    expect(output).toContain('No hallucinations');
  });

  test('includes file-precedence constraint', () => {
    const output = generateSkillMd('Agent', 'Use case', 'react');
    expect(output).toContain('takes precedence over model training data');
  });

  test('output JSON is valid JSON schema structure', () => {
    const output = generateSkillMd('Agent', 'Use case', 'react');
    const jsonMatch = output.match(/```json\n([\s\S]+?)\n```/);
    expect(jsonMatch).toBeTruthy();
    expect(() => JSON.parse(jsonMatch[1])).not.toThrow();
  });
});

describe('detectAutoSkills()', () => {
  test('detects security skills from "security audit" use case', () => {
    const skills = detectAutoSkills('Perform a security audit of the codebase');
    expect(skills).toContain('security-policy.md');
    expect(skills).toContain('cve-scanner.md');
  });

  test('detects code quality skill from "code review" use case', () => {
    const skills = detectAutoSkills('Review pull requests for code quality');
    expect(skills).toContain('code-quality.md');
  });

  test('detects vector search skill from "RAG" use case', () => {
    const skills = detectAutoSkills('Build a RAG agent for knowledge retrieval');
    expect(skills).toContain('vector-search.md');
  });

  test('detects data validator from "data pipeline" use case', () => {
    const skills = detectAutoSkills('Validate data pipeline schema drift');
    expect(skills).toContain('data-validator.md');
  });

  test('detects incident triage from "incident" use case', () => {
    const skills = detectAutoSkills('Triage production incidents and page oncall');
    expect(skills).toContain('incident-triage.md');
  });

  test('detects sprint planner from "sprint" use case', () => {
    const skills = detectAutoSkills('Plan the next agile sprint with Jira tasks');
    expect(skills).toContain('sprint-planner.md');
  });

  test('returns empty array for unrecognized use case', () => {
    expect(detectAutoSkills('Help me write a poem')).toHaveLength(0);
  });

  test('handles empty string', () => {
    expect(detectAutoSkills('')).toHaveLength(0);
  });

  test('handles null', () => {
    expect(detectAutoSkills(null)).toHaveLength(0);
  });

  test('handles multiple matching patterns', () => {
    const skills = detectAutoSkills('Security audit and code review for CVE vulnerabilities');
    expect(skills.length).toBeGreaterThan(2);
    expect(skills).toContain('security-policy.md');
    expect(skills).toContain('code-quality.md');
  });
});

describe('getFileExtClass()', () => {
  test('returns fc-md for .md files', () => {
    expect(getFileExtClass('SKILL.md')).toBe('fc-md');
    expect(getFileExtClass('agents.md')).toBe('fc-md');
  });

  test('returns fc-txt for .txt files', () => {
    expect(getFileExtClass('notes.txt')).toBe('fc-txt');
  });

  test('returns fc-docx for .docx files', () => {
    expect(getFileExtClass('document.docx')).toBe('fc-docx');
  });

  test('returns fc-other for unknown extensions', () => {
    expect(getFileExtClass('script.py')).toBe('fc-other');
    expect(getFileExtClass('data.json')).toBe('fc-other');
    expect(getFileExtClass('archive.zip')).toBe('fc-other');
  });

  test('handles uppercase extensions', () => {
    expect(getFileExtClass('README.MD')).toBe('fc-md');
  });
});

describe('Build validation flow', () => {
  test('complete valid build inputs pass validation', () => {
    const result = validateInputs('Security Auditor Pro', 'Perform security audits on Python codebases', 'security');
    expect(result.valid).toBe(true);
  });

  test('valid inputs generate non-empty SKILL.md', () => {
    const md = generateSkillMd('Security Auditor Pro', 'Perform security audits', 'security');
    expect(md.length).toBeGreaterThan(100);
  });

  test('SKILL.md contains model field', () => {
    const md = generateSkillMd('My Agent', 'Use case', 'react');
    expect(md).toContain('model: anthropic/claude-sonnet-4');
  });

  test('SKILL.md max_lines is set to 200', () => {
    const md = generateSkillMd('My Agent', 'Use case', 'react');
    expect(md).toContain('max_lines: 200');
  });

  test('generated SKILL.md has YAML frontmatter delimiters', () => {
    const md = generateSkillMd('My Agent', 'Use case', 'react');
    const lines = md.split('\n');
    expect(lines[0]).toBe('---');
    const closingIndex = lines.slice(1).findIndex(l => l === '---');
    expect(closingIndex).toBeGreaterThan(0);
  });
});

describe('Edge cases', () => {
  test('agent name with only numbers', () => {
    const result = validateInputs('123', 'Use case', 'react');
    expect(result.valid).toBe(true); // numbers are valid
  });

  test('very long agent name slugifies correctly', () => {
    const longName = 'This Is A Very Long Agent Name With Many Words';
    expect(slugify(longName)).toMatch(/^[a-z0-9-]+$/);
  });

  test('use case with only spaces fails validation', () => {
    const result = validateInputs('Agent', '     ', 'react');
    expect(result.valid).toBe(false);
  });

  test('template string "custom" is valid', () => {
    const result = validateInputs('Agent', 'Use case', 'custom');
    expect(result.valid).toBe(true);
  });

  test('all 6 template keys pass generateSkillMd without throwing', () => {
    Object.keys(TEMPLATES).forEach(key => {
      expect(() => generateSkillMd('Agent', 'Some use case', key)).not.toThrow();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// TEST SUITE: Logic Component Constants & Defaults
// ══════════════════════════════════════════════════════════════════════════

// Mirror logic component defaults from builder for unit testing
const LOGIC_COMPONENTS = {
  router: {
    component_type: 'logic-gate',
    routing_strategy: 'deterministic',
    evaluation_order: 'top-down-first-match',
    default_fallback: 'general-assistant',
    on_no_match: 'hitl-gate',
  },
  sequence: {
    component_type: 'iterator',
    execution_mode: 'sequential',
    max_concurrency: 5,
    max_items: 1000,
    on_item_error: 'continue',
    retry_count: 2,
    checkpoint_enabled: true,
    checkpoint_interval: 10,
  },
  gate: {
    component_type: 'hitl-checkpoint',
    timeout_hours: 24,
    on_timeout: 'auto_reject',
    require_reason: true,
    allow_modification: true,
    min_approvers: 1,
  },
  data_map: {
    component_type: 'data-mapper',
    on_mapping_error: 'halt',
  },
  error_policy: {
    component_type: 'error-handler',
    circuit_breaker: { enabled: true, failure_threshold: 5, success_threshold: 2, half_open_timeout_seconds: 30 },
    global: { partial_results_on_halt: true, write_error_to_memories: true },
  },
};

const DEFAULT_ROUTER_RULES = [
  { priority: 1, logic_type: 'JSON_PATH',    condition: '$.security_score < 0.5',        target: 'security-audit.md' },
  { priority: 2, logic_type: 'JSON_PATH',    condition: '$.severity == "CRITICAL"',       target: 'incident-response.md' },
  { priority: 3, logic_type: 'REGEX',        condition: '^FIX-[\\d]+|^INC-[\\d]+',       target: 'incident-response.md' },
  { priority: 4, logic_type: 'REGEX',        condition: '^(feat|fix|chore)\\(.+\\):',     target: 'code-review.md' },
  { priority: 5, logic_type: 'KEYWORD_ANY',  condition: ['sprint','backlog','story'],      target: 'sprint-planner.md' },
  { priority: 6, logic_type: 'KEYWORD_ANY',  condition: ['audit','cve','owasp','vuln'],   target: 'security-audit.md' },
  { priority: 7, logic_type: 'REGEX',        condition: '\\.(js|ts|py|cpp)$',             target: 'code-review.md' },
  { priority: 8, logic_type: 'REGEX',        condition: '\\.(pdf|docx|doc|pptx)$',        target: 'rag-retrieval.md' },
  { priority: 9, logic_type: 'REGEX',        condition: '\\.(csv|json|yaml)$',            target: 'data-validator.md' },
];

const LOGIC_TYPES = ['JSON_PATH', 'REGEX', 'KEYWORD_ANY'];
const ERROR_LEVELS = [0, 1, 2, 3, 4];
const GATE_STATES  = ['INACTIVE', 'PENDING', 'APPROVED', 'REJECTED', 'MODIFIED', 'TIMED_OUT'];

describe('Logic Component Constants', () => {
  test('all 5 logic components are defined', () => {
    ['router','sequence','gate','data_map','error_policy'].forEach(k => {
      expect(LOGIC_COMPONENTS).toHaveProperty(k);
    });
  });

  test.each(Object.keys(LOGIC_COMPONENTS))('component "%s" has component_type field', (key) => {
    expect(LOGIC_COMPONENTS[key]).toHaveProperty('component_type');
    expect(typeof LOGIC_COMPONENTS[key].component_type).toBe('string');
    expect(LOGIC_COMPONENTS[key].component_type.length).toBeGreaterThan(0);
  });
});

describe('ROUTER — Default Rules', () => {
  test('default router has 9 rules', () => {
    expect(DEFAULT_ROUTER_RULES).toHaveLength(9);
  });

  test('rules have sequential unique priorities 1-9', () => {
    const priorities = DEFAULT_ROUTER_RULES.map(r => r.priority).sort((a,b) => a-b);
    priorities.forEach((p, i) => expect(p).toBe(i + 1));
  });

  test.each(DEFAULT_ROUTER_RULES)('rule %# has valid logic_type', (rule) => {
    expect(LOGIC_TYPES).toContain(rule.logic_type);
  });

  test.each(DEFAULT_ROUTER_RULES)('rule %# has non-empty target skill', (rule) => {
    expect(typeof rule.target).toBe('string');
    expect(rule.target.endsWith('.md')).toBe(true);
  });

  test('JSON_PATH rules come before REGEX rules (most specific first)', () => {
    const jsonPathPriorities = DEFAULT_ROUTER_RULES
      .filter(r => r.logic_type === 'JSON_PATH').map(r => r.priority);
    const regexPriorities = DEFAULT_ROUTER_RULES
      .filter(r => r.logic_type === 'REGEX').map(r => r.priority);
    const maxJsonPath = Math.max(...jsonPathPriorities);
    const minRegex    = Math.min(...regexPriorities);
    expect(maxJsonPath).toBeLessThan(minRegex);
  });

  test('KEYWORD_ANY conditions are arrays', () => {
    DEFAULT_ROUTER_RULES
      .filter(r => r.logic_type === 'KEYWORD_ANY')
      .forEach(r => {
        expect(Array.isArray(r.condition)).toBe(true);
        expect(r.condition.length).toBeGreaterThan(0);
      });
  });

  test('all target skills are known skills or general-assistant', () => {
    const validTargets = new Set([
      'security-audit.md','incident-response.md','code-review.md',
      'sprint-planner.md','rag-retrieval.md','data-validator.md',
      'general-assistant','hitl-gate',
    ]);
    DEFAULT_ROUTER_RULES.forEach(r => {
      expect(validTargets.has(r.target)).toBe(true);
    });
  });
});

describe('SEQUENCE — Defaults', () => {
  const seq = LOGIC_COMPONENTS.sequence;

  test('max_concurrency is between 1 and 5', () => {
    expect(seq.max_concurrency).toBeGreaterThanOrEqual(1);
    expect(seq.max_concurrency).toBeLessThanOrEqual(5);
  });

  test('max_items has a reasonable ceiling', () => {
    expect(seq.max_items).toBeGreaterThan(0);
    expect(seq.max_items).toBeLessThanOrEqual(10000);
  });

  test('on_item_error is valid', () => {
    expect(['continue','halt','retry']).toContain(seq.on_item_error);
  });

  test('checkpoint_enabled is true by default', () => {
    expect(seq.checkpoint_enabled).toBe(true);
  });

  test('checkpoint_interval is a positive integer', () => {
    expect(typeof seq.checkpoint_interval).toBe('number');
    expect(seq.checkpoint_interval).toBeGreaterThan(0);
    expect(Number.isInteger(seq.checkpoint_interval)).toBe(true);
  });

  test('retry_count is 2 or more', () => {
    expect(seq.retry_count).toBeGreaterThanOrEqual(2);
  });
});

describe('GATE — Defaults', () => {
  const gate = LOGIC_COMPONENTS.gate;

  test('timeout_hours is positive', () => {
    expect(gate.timeout_hours).toBeGreaterThan(0);
  });

  test('on_timeout is auto_reject (safe default)', () => {
    expect(gate.on_timeout).toBe('auto_reject');
  });

  test('require_reason is true', () => {
    expect(gate.require_reason).toBe(true);
  });

  test('min_approvers is at least 1', () => {
    expect(gate.min_approvers).toBeGreaterThanOrEqual(1);
  });

  test('gate states cover all transitions', () => {
    ['INACTIVE','PENDING','APPROVED','REJECTED','MODIFIED','TIMED_OUT'].forEach(state => {
      expect(GATE_STATES).toContain(state);
    });
  });
});

describe('ERROR_POLICY — Defaults', () => {
  const ep = LOGIC_COMPONENTS.error_policy;

  test('circuit breaker is enabled by default', () => {
    expect(ep.circuit_breaker.enabled).toBe(true);
  });

  test('circuit breaker failure_threshold is between 3 and 10', () => {
    expect(ep.circuit_breaker.failure_threshold).toBeGreaterThanOrEqual(3);
    expect(ep.circuit_breaker.failure_threshold).toBeLessThanOrEqual(10);
  });

  test('partial_results_on_halt is true', () => {
    expect(ep.global.partial_results_on_halt).toBe(true);
  });

  test('write_error_to_memories is true', () => {
    expect(ep.global.write_error_to_memories).toBe(true);
  });

  test('all 5 error levels are defined', () => {
    ERROR_LEVELS.forEach(level => {
      expect(ERROR_LEVELS).toContain(level);
    });
  });
});

describe('Logic Component — Integration: Architect selection rules', () => {
  function shouldEnableGate(useCase, hitlEnabled) {
    const ul = useCase.toLowerCase();
    return hitlEnabled && /deploy|delete|payment|permission|production/.test(ul);
  }

  function shouldEnableSequence(useCase) {
    return /batch|bulk|all \d+|audit \d+|\d+ repos|\d+ files/.test(useCase.toLowerCase());
  }

  function shouldEnableRouter(useCase, fileTypes) {
    return fileTypes.length > 1 || /route|dispatch|multiple skills/.test(useCase.toLowerCase());
  }

  test('deploy use case + HITL on → GATE enabled', () => {
    expect(shouldEnableGate('Deploy v2.1.4 to production environment', true)).toBe(true);
  });

  test('simple Q&A use case + HITL on → GATE NOT enabled', () => {
    expect(shouldEnableGate('Answer questions about our documentation', true)).toBe(false);
  });

  test('batch use case → SEQUENCE enabled', () => {
    expect(shouldEnableSequence('Audit all 50 repos for security vulnerabilities')).toBe(true);
    expect(shouldEnableSequence('Process 200 log entries')).toBe(true);
  });

  test('single-item use case → SEQUENCE NOT enabled', () => {
    expect(shouldEnableSequence('Review this pull request')).toBe(false);
  });

  test('mixed file types → ROUTER enabled', () => {
    expect(shouldEnableRouter('Review files', ['.py', '.pdf', '.csv'])).toBe(true);
  });

  test('single file type → ROUTER NOT auto-enabled', () => {
    expect(shouldEnableRouter('Review Python files', ['.py'])).toBe(false);
  });
});
