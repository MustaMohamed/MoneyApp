const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  compareRenderPasses,
  findOrphanGeneratedOutputs,
  findParityErrors,
  measureRenderedTargets,
  validateFormat,
  validateRegisteredStructure,
} = require('../lib/structure');

const root = path.resolve(__dirname, '../../..');
const cases = JSON.parse(
  fs.readFileSync(path.join(root, 'harness/fixtures/invalid/structure_cases.json'), 'utf8'),
);
const supportedTargets = [
  'AGENTS.md',
  'CLAUDE.md',
  '.codex/agents/sarah.toml',
  '.claude/agents/sarah.md',
  '.codex/agents/marcus.toml',
  '.claude/agents/marcus.md',
  '.codex/agents/layla.toml',
  '.claude/agents/layla.md',
  '.codex/agents/tariq.toml',
  '.claude/agents/tariq.md',
  '.codex/agents/dev.toml',
  '.claude/agents/dev.md',
  '.agents/skills/moneyapp-expert-panel/SKILL.md',
  '.claude/skills/moneyapp-expert-panel/SKILL.md',
  '.claude/commands/feature.md',
  '.claude/commands/status.md',
];

void test('direct target edits fail generation parity', () => {
  const fixture = cases.find((entry) => entry.name === 'direct-generated-edit');
  const errors = findParityErrors(new Map([['AGENTS.md', fixture.expected]]), {
    'AGENTS.md': fixture.actual,
  });
  assert(errors.some((error) => error.ruleId === fixture.expectedRule));
});

void test('generated files not registered in the manifest fail', () => {
  const fixture = cases.find((entry) => entry.name === 'unregistered-generated-output');
  const files = Object.fromEntries(
    fixture.generatedFiles.map((file) => [file, '<!-- GENERATED -->\n']),
  );
  const errors = findOrphanGeneratedOutputs('GENERATED', new Set(fixture.registeredTargets), files);
  assert(errors.some((error) => error.ruleId === fixture.expectedRule));
});

void test('different consecutive render passes fail determinism', () => {
  const fixture = cases.find((entry) => entry.name === 'nondeterministic-generation');
  const errors = compareRenderPasses(
    new Map([['AGENTS.md', fixture.first]]),
    new Map([['AGENTS.md', fixture.second]]),
  );
  assert(errors.some((error) => error.ruleId === fixture.expectedRule));
});

void test('missing personas and all sixteen supported targets fail structural validation', () => {
  const errors = validateRegisteredStructure(
    root,
    { generatedNotice: 'GENERATED', personas: [], targets: [] },
    new Map(),
    {},
  );
  assert(errors.some((error) => error.ruleId === 'PERSONA-SURFACE-REGISTRATION'));
  assert.equal(
    errors.filter((error) => error.ruleId === 'INCOMPLETE-TARGET-REGISTRATION').length,
    16,
  );
});

void test('accepts exactly the sixteen supported targets', () => {
  const errors = validateRegisteredStructure(
    root,
    {
      generatedNotice: 'GENERATED',
      personas: [],
      targets: supportedTargets.map((path) => ({ path })),
    },
    new Map(),
    {},
  );
  assert.deepEqual(
    errors.filter((error) => error.ruleId === 'INCOMPLETE-TARGET-REGISTRATION'),
    [],
  );
});

void test('rejects a seventeenth unsupported target', () => {
  const errors = validateRegisteredStructure(
    root,
    {
      generatedNotice: 'GENERATED',
      personas: [],
      targets: [...supportedTargets, 'README.md'].map((path) => ({ path })),
    },
    new Map(),
    {},
  );
  assert(
    errors.some(
      (error) =>
        error.ruleId === 'INCOMPLETE-TARGET-REGISTRATION' &&
        error.file === 'README.md' &&
        /unsupported/.test(error.message),
    ),
  );
});

void test('invalid generated TOML and frontmatter fail format validation', () => {
  assert(
    validateFormat('.codex/agents/dev.toml', 'name = "dev"\n').some(
      (error) => error.ruleId === 'GENERATED-FORMAT',
    ),
  );
  assert(
    validateFormat('.claude/agents/dev.md', 'no frontmatter\n').some(
      (error) => error.ruleId === 'GENERATED-FORMAT',
    ),
  );
});

const validAgentToml = [
  'description = "Senior developer"',
  'developer_instructions = """',
  'Follow the generated policy."""',
  'name = "dev"',
  '',
].join('\n');

void test('accepts the exact generated Codex TOML schema', () => {
  assert.deepEqual(validateFormat('.codex/agents/dev.toml', validAgentToml), []);
});

void test('accepts TOML escapes and Unicode scalars in short basic strings', () => {
  const text = validAgentToml.replace(
    'description = "Senior developer"',
    String.raw`description = "Escapes: \b \t \n \f \r \" \\ \u263A \U0001F600"`,
  );

  assert.deepEqual(validateFormat('.codex/agents/dev.toml', text), []);
});

void test('accepts valid multiline TOML escapes and line continuation', () => {
  const text = [
    'description = "Senior developer"',
    'developer_instructions = """',
    'Escapes: \\\\ \\" \\b \\f \\n \\r \\t \\u263A \\U0001F600',
    'Continue this ' + '\\',
    '  on the next line."""',
    'name = "dev"',
    '',
  ].join('\n');

  assert.deepEqual(validateFormat('.codex/agents/dev.toml', text), []);
});

for (const [name, text] of [
  [
    'junk assignment syntax',
    validAgentToml.replace('name = "dev"', '= invalid toml\nname = "dev"'),
  ],
  [
    'unterminated developer instructions',
    validAgentToml.replace('Follow the generated policy."""', 'Follow the generated policy.'),
  ],
  [
    'extra triple quotes',
    validAgentToml.replace(
      'developer_instructions = """\nFollow the generated policy."""',
      'developer_instructions = """"""',
    ),
  ],
  ['invalid quoted scalar', validAgentToml.replace('"dev"', '"dev\\q"')],
  [
    'JSON-only escaped solidus in short basic string',
    validAgentToml.replace('"dev"', String.raw`"dev\/ops"`),
  ],
  [
    'high-surrogate escape in short basic string',
    validAgentToml.replace('"dev"', String.raw`"\uD800"`),
  ],
  [
    'low-surrogate escape in short basic string',
    validAgentToml.replace('"dev"', String.raw`"\uDC00"`),
  ],
  [
    'unknown multiline escape',
    validAgentToml.replace(
      'Follow the generated policy."""',
      String.raw`Follow the generated policy \q."""`,
    ),
  ],
  [
    'malformed short Unicode escape',
    validAgentToml.replace(
      'Follow the generated policy."""',
      String.raw`Follow the generated policy \u12."""`,
    ),
  ],
  [
    'malformed long Unicode escape',
    validAgentToml.replace(
      'Follow the generated policy."""',
      String.raw`Follow the generated policy \U0000ZZZZ."""`,
    ),
  ],
  [
    'out-of-range Unicode escape',
    validAgentToml.replace(
      'Follow the generated policy."""',
      String.raw`Follow the generated policy \U00110000."""`,
    ),
  ],
  [
    'surrogate Unicode escape',
    validAgentToml.replace(
      'Follow the generated policy."""',
      String.raw`Follow the generated policy \uD800."""`,
    ),
  ],
  [
    'dangling multiline backslash',
    validAgentToml.replace(
      'Follow the generated policy."""',
      'Follow the generated policy ' + '\\' + '"""',
    ),
  ],
  ['duplicate key', `${validAgentToml}name = "other"\n`],
]) {
  void test(`rejects Codex TOML with ${name}`, () => {
    assert(
      validateFormat('.codex/agents/dev.toml', text).some(
        (error) => error.ruleId === 'GENERATED-FORMAT',
      ),
    );
  });
}

const validClaudeAgent = [
  '---',
  'name: dev',
  'description: "Senior developer"',
  'tools: Read, Write, Edit',
  'model: sonnet',
  '---',
  'Instructions.',
  '',
].join('\n');
const validSkill = [
  '---',
  'name: moneyapp-expert-panel',
  'description: MoneyApp inline advisory panel',
  '---',
  '# Panel',
  '',
].join('\n');
const validCommand = ['---', 'description: Run the canonical workflow', '---', 'Run it.', ''].join(
  '\n',
);

void test('accepts exact generated frontmatter schemas and scalar styles', () => {
  assert.deepEqual(validateFormat('.claude/agents/dev.md', validClaudeAgent), []);
  assert.deepEqual(validateFormat('.agents/skills/moneyapp-expert-panel/SKILL.md', validSkill), []);
  assert.deepEqual(validateFormat('.claude/commands/feature.md', validCommand), []);
});

void test('accepts planned MoneyApp plain and JSON-quoted frontmatter strings', () => {
  const plannedSkill = validSkill.replace(
    'MoneyApp inline advisory panel',
    'MoneyApp inline advisory panel for [sarah], [marcus], [layla], [tariq], and [dev].',
  );
  const productCommand = validCommand.replace(
    'Run the canonical workflow',
    'Product/UX owner (MoneyApp), HeroUI Native',
  );
  const quotedCommand = validCommand.replace(
    'Run the canonical workflow',
    '"MoneyApp \\\\ workflow \\u2014 [sarah]"',
  );

  assert.deepEqual(
    validateFormat('.agents/skills/moneyapp-expert-panel/SKILL.md', plannedSkill),
    [],
  );
  assert.deepEqual(validateFormat('.claude/commands/feature.md', productCommand), []);
  assert.deepEqual(validateFormat('.claude/commands/feature.md', quotedCommand), []);
});

void test('accepts synthetic outputs from the planned adapter templates', () => {
  const codexAgent = [
    'description = "Senior React Native developer"',
    'developer_instructions = """',
    '<!-- GENERATED: edit canonical harness sources -->',
    '## Dev',
    'Implements approved plans for product/UX (MoneyApp).',
    'Use `src/modules/<domain>/` and consult [sarah]."""',
    'name = "dev"',
    '',
  ].join('\n');
  const statusCommand = validCommand.replace(
    'Run the canonical workflow',
    'Report current MoneyApp workflow state from durable artifacts',
  );

  assert.deepEqual(validateFormat('.codex/agents/dev.toml', codexAgent), []);
  assert.deepEqual(validateFormat('.claude/agents/dev.md', validClaudeAgent), []);
  assert.deepEqual(validateFormat('.agents/skills/moneyapp-expert-panel/SKILL.md', validSkill), []);
  assert.deepEqual(validateFormat('.claude/commands/status.md', statusCommand), []);
});

for (const [name, value] of [
  ['reserved at-sign', '@invalid'],
  ['colon-space boundary', 'bad: value'],
  ['null scalar', 'null'],
  ['tilde null scalar', '~'],
  ['boolean scalar', 'true'],
  ['integer scalar', '42'],
  ['floating-point scalar', '4.2'],
  ['hexadecimal scalar', '0x2A'],
  ['special numeric scalar', '.NaN'],
  ['timestamp scalar', '2026-07-24'],
  ['comment boundary', 'value # comment'],
  ['leading sequence indicator', '- item'],
  ['leading mapping-key indicator', '? key'],
  ['leading mapping-value indicator', ': value'],
  ['leading tag indicator', '!tag value'],
  ['leading anchor indicator', '&anchor value'],
  ['leading alias indicator', '*alias'],
  ['leading block indicator', '| block'],
  ['leading folded-block indicator', '> folded'],
  ['leading directive indicator', '%directive'],
  ['leading reserved backtick', '`reserved'],
  ['leading comment indicator', '# comment'],
  ['single-quoted YAML scalar', "'quoted'"],
]) {
  void test(`rejects frontmatter with ${name}`, () => {
    const text = validCommand.replace('Run the canonical workflow', value);
    assert(
      validateFormat('.claude/commands/feature.md', text).some(
        (error) => error.ruleId === 'GENERATED-FORMAT',
      ),
    );
  });
}

for (const [name, file, text] of [
  [
    'collection syntax',
    '.claude/agents/dev.md',
    validClaudeAgent.replace('description: "Senior developer"', 'description: ['),
  ],
  [
    'duplicate key',
    '.agents/skills/moneyapp-expert-panel/SKILL.md',
    validSkill.replace(
      'description: MoneyApp inline advisory panel',
      'description: first\ndescription: second',
    ),
  ],
  [
    'missing required key',
    '.claude/agents/dev.md',
    validClaudeAgent.replace('model: sonnet\n', ''),
  ],
  [
    'invalid JSON-quoted scalar',
    '.claude/agents/dev.md',
    validClaudeAgent.replace('"Senior developer"', '"Senior\\qdeveloper"'),
  ],
  [
    'unexpected nested scalar',
    '.claude/agents/dev.md',
    validClaudeAgent.replace('model: sonnet', 'model: sonnet\n  nested: value'),
  ],
  [
    'unexpected key',
    '.claude/commands/feature.md',
    validCommand.replace('description:', 'name: feature\ndescription:'),
  ],
  [
    'malformed opening delimiter',
    '.claude/commands/feature.md',
    validCommand.replace(/^---/, '----'),
  ],
  [
    'malformed closing delimiter',
    '.claude/commands/feature.md',
    validCommand.replace('\n---\nRun it.', '\n--- extra\nRun it.'),
  ],
]) {
  void test(`rejects frontmatter with ${name}`, () => {
    assert(validateFormat(file, text).some((error) => error.ruleId === 'GENERATED-FORMAT'));
  });
}

void test('generated targets require provenance markers', () => {
  const errors = validateRegisteredStructure(
    root,
    {
      generatedNotice: 'GENERATED',
      personas: [],
      targets: [{ path: 'AGENTS.md' }],
    },
    new Map([['AGENTS.md', '# MoneyApp\n']]),
    { 'AGENTS.md': '# MoneyApp\n' },
  );
  assert(errors.some((error) => error.ruleId === 'PROVENANCE-MARKER'));
});

void test('reports deterministic line and byte budgets for rendered targets', () => {
  assert.deepEqual(
    measureRenderedTargets(
      new Map([
        ['AGENTS.md', 'Alpha\nBeta\n'],
        ['CLAUDE.md', '€\n'],
      ]),
    ),
    [
      { file: 'AGENTS.md', lines: 2, bytes: 11 },
      { file: 'CLAUDE.md', lines: 1, bytes: 4 },
    ],
  );
});
