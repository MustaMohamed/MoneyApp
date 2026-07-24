const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { extractSection } = require('../lib/render');

const root = path.resolve(__dirname, '../../..');
const roles = ['sarah', 'marcus', 'layla', 'tariq', 'dev'];

void test('each supported surface has one current persona', () => {
  for (const role of roles) {
    const codex = fs.readFileSync(path.join(root, `.codex/agents/${role}.toml`), 'utf8');
    const claude = fs.readFileSync(path.join(root, `.claude/agents/${role}.md`), 'utf8');
    assert.equal(codex.includes('Babel signals transform is installed'), false);
    assert.equal(claude.includes('Babel signals transform is installed'), false);
    assert.match(codex, new RegExp(`name = "${role}"`));
    assert.match(claude, new RegExp(`name: ${role}`));
  }
});

void test('inline panel is byte-identical on both supported surfaces', () => {
  const agents = fs.readFileSync(
    path.join(root, '.agents/skills/moneyapp-expert-panel/SKILL.md'),
    'utf8',
  );
  const claude = fs.readFileSync(
    path.join(root, '.claude/skills/moneyapp-expert-panel/SKILL.md'),
    'utf8',
  );
  assert.equal(agents, claude);
});

void test('generated persona surfaces end with one newline', () => {
  const files = [
    ...roles.flatMap((role) => [`.codex/agents/${role}.toml`, `.claude/agents/${role}.md`]),
    '.agents/skills/moneyapp-expert-panel/SKILL.md',
    '.claude/skills/moneyapp-expert-panel/SKILL.md',
  ];

  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(text, /[^\n]\n$/, `${file} must have exactly one terminal newline`);
  }
});

void test('every canonical persona has dispatched and inline sections', () => {
  for (const role of roles) {
    const source = fs.readFileSync(path.join(root, `harness/personas/${role}.md`), 'utf8');
    assert.doesNotThrow(() => extractSection(source, 'agent'));
    assert.doesNotThrow(() => extractSection(source, 'inline'));
  }
});

void test('canonical persona sections retain binding authority and role decisions', () => {
  const sections = Object.fromEntries(
    roles.map((role) => {
      const source = fs.readFileSync(path.join(root, `harness/personas/${role}.md`), 'utf8');
      return [
        role,
        {
          agent: extractSection(source, 'agent'),
          inline: extractSection(source, 'inline'),
        },
      ];
    }),
  );

  for (const role of roles) {
    for (const section of Object.values(sections[role])) {
      for (const phrase of [
        'critical trigger',
        'explicit user request',
        'dependency',
        'native code',
        'auth',
        'data-loss',
        'critical copy',
        'high-blast-radius',
        'Device QA',
      ]) {
        assert.match(section, new RegExp(phrase), `${role} section is missing ${phrase}`);
      }
    }
  }

  for (const section of Object.values(sections.sarah)) {
    for (const phrase of ['Spec sign-off', 'Device QA', 'Sarah approves plans']) {
      assert.match(section, new RegExp(phrase), `Sarah section is missing ${phrase}`);
    }
  }

  for (const section of Object.values(sections.tariq)) {
    for (const phrase of [
      'merge recommendation',
      'Zustand v5',
      'src/modules/<domain>/',
      'HeroUI Native',
    ]) {
      assert.equal(section.includes(phrase), true, `Tariq section is missing ${phrase}`);
    }
  }

  for (const phrase of [
    'implements approved plans',
    'Zustand v5',
    'src/modules/<domain>/',
    'HeroUI Native',
  ]) {
    assert.equal(sections.dev.agent.includes(phrase), true, `Dev agent is missing ${phrase}`);
  }

  for (const phrase of ['product/UX', 'HeroUI Native']) {
    assert.equal(sections.marcus.agent.includes(phrase), true, `Marcus agent is missing ${phrase}`);
  }
});

void test('persona adapters keep their surface-specific serialization', () => {
  const codexTemplate = fs.readFileSync(
    path.join(root, 'harness/templates/codex_agent.toml'),
    'utf8',
  );
  assert.equal(
    codexTemplate,
    [
      'description = {{json:description}}',
      'developer_instructions = """',
      '<!-- {{raw:notice}} -->',
      '{{include:personaSource#agent}}"""',
      'name = {{json:id}}',
      '',
    ].join('\n'),
  );

  const claudeTemplate = fs.readFileSync(
    path.join(root, 'harness/templates/claude_agent.md'),
    'utf8',
  );
  assert.match(claudeTemplate, /^---\nname: {{raw:id}}\ndescription: {{json:description}}\n/);

  const panelTemplate = fs.readFileSync(
    path.join(root, 'harness/templates/expert_panel.md'),
    'utf8',
  );
  for (const role of roles) {
    assert.match(panelTemplate, new RegExp(`harness/personas/${role}\\.md#inline`));
  }
});
