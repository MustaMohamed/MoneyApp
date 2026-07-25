const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { assertSafeRelativePath, resolveInside, writeFileAtomic } = require('../lib/paths');
const { loadManifest, validateManifest } = require('../lib/manifest');

const repositoryRoot = path.resolve(__dirname, '../../..');

function createTarget(overrides = {}) {
  return {
    id: 'root-agents',
    path: 'AGENTS.md',
    template: 'harness/templates/agents.md',
    sources: ['harness/policy/authority.md'],
    ...overrides,
  };
}

function createManifest(overrides = {}) {
  const workflow = {
    machine: 'harness/workflow/state_machine.json',
    tasks: {
      directory: 'docs/superpowers/task-graphs',
      limits: {
        maxTasks: 40,
        maxDependencies: 12,
        maxReadPaths: 24,
        maxWritePaths: 16,
        maxAcceptanceCriteria: 12,
        maxVerificationCommands: 8,
        maxTaskTextBytes: 8192,
        maxPacketBytes: 24576,
      },
    },
    ...overrides.workflow,
  };
  return {
    version: 1,
    policyOrder: [],
    targets: [],
    personas: [],
    rules: 'harness/rules/semantics.json',
    verification: { checks: [] },
    ...overrides,
    workflow,
  };
}

function createManifestRoot(t, manifest) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-manifest-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/manifest.json'), JSON.stringify(manifest));
  if (manifest.workflow?.machine) {
    writeFixture(
      root,
      manifest.workflow.machine,
      fs.readFileSync(path.join(repositoryRoot, 'harness/workflow/state_machine.json'), 'utf8'),
    );
  }
  return root;
}

function writeFixture(root, relativePath, content = '') {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

void test('accepts a unique repository-relative target', () => {
  assert.doesNotThrow(() =>
    validateManifest(
      createManifest({
        targets: [createTarget()],
      }),
    ),
  );
});

void test('rejects parent traversal and absolute paths', () => {
  for (const value of ['../AGENTS.md', '/tmp/AGENTS.md']) {
    assert.throws(() => assertSafeRelativePath(value), /repository-relative/);
  }
});

void test('rejects Windows absolute and backslash paths', () => {
  for (const value of [
    'C:\\tmp\\AGENTS.md',
    'C:/tmp/AGENTS.md',
    '\\\\server\\share\\AGENTS.md',
    '//server/share/AGENTS.md',
    'nested\\AGENTS.md',
  ]) {
    assert.throws(() => assertSafeRelativePath(value), /repository-relative/);
  }
});

void test('rejects non-normal repository-relative paths', () => {
  for (const value of ['nested/./output.md', 'nested//output.md', 'nested/output.md/']) {
    assert.throws(() => assertSafeRelativePath(value), /normalized repository-relative/);
  }
});

void test('rejects non-NFC path spelling', () => {
  assert.throws(() => assertSafeRelativePath('generated/cafe\u0301.md'), /NFC-normalized/);
});

void test('accepts NFC paths and uppercase root filenames', () => {
  for (const value of ['generated/caf\u00e9.md', 'AGENTS.md', 'CLAUDE.md']) {
    assert.doesNotThrow(() => assertSafeRelativePath(value));
  }
});

void test('rejects Windows-invalid and control characters in path segments', () => {
  for (const character of ['<', '>', ':', '"', '|', '?', '*', '\u0001', '\u007f', '\u0085']) {
    assert.throws(
      () => assertSafeRelativePath(`nested/bad${character}name.md`),
      /non-portable path segment/,
    );
  }
});

void test('rejects Windows device basenames with or without extensions', () => {
  for (const segment of [
    'CON',
    'prn.txt',
    'Aux.md',
    'NUL.json',
    'com1.toml',
    'COM9',
    'lpt1.md',
    'LPT9',
  ]) {
    assert.throws(() => assertSafeRelativePath(`nested/${segment}`), /non-portable path segment/);
  }
});

void test('rejects path segments ending in a dot or space', () => {
  for (const value of ['nested/name.', 'nested/name ']) {
    assert.throws(() => assertSafeRelativePath(value), /non-portable path segment/);
  }
});

void test('accepts portable dot-directories and non-device names', () => {
  for (const value of [
    '.claude/commands/feature.md',
    '.codex/agents/dev.toml',
    'nested/console.md',
    'nested/COM10.md',
  ]) {
    assert.doesNotThrow(() => assertSafeRelativePath(value));
  }
});

void test('resolves and writes only repository-relative paths', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-paths-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  assert.equal(resolveInside(root, 'nested/file.md'), path.join(root, 'nested/file.md'));
  writeFileAtomic(root, 'nested/file.md', 'canonical\n');

  assert.equal(fs.readFileSync(path.join(root, 'nested/file.md'), 'utf8'), 'canonical\n');
  assert.deepEqual(fs.readdirSync(path.join(root, 'nested')), ['file.md']);
});

void test('atomic write rejects a case-aliased existing file without changing it', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-root-'));
  const existing = path.join(root, 'Existing.md');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(existing, 'original\n');
  const originalEntries = fs.readdirSync(root).sort();

  let caught;
  try {
    writeFileAtomic(root, 'existing.md', 'replacement\n');
  } catch (error) {
    caught = error;
  }

  assert.equal(fs.readFileSync(existing, 'utf8'), 'original\n');
  assert.deepEqual(fs.readdirSync(root).sort(), originalEntries);
  assert.match(caught?.message ?? '', /on-disk path alias.*existing\.md.*Existing\.md/i);
});

void test('atomic write rejects a case-aliased existing directory without writing inside it', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-root-'));
  const existing = path.join(root, 'Generated');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(existing);
  const originalEntries = fs.readdirSync(root).sort();

  let caught;
  try {
    writeFileAtomic(root, 'generated/output.md', 'canonical output\n');
  } catch (error) {
    caught = error;
  }

  assert.deepEqual(fs.readdirSync(root).sort(), originalEntries);
  assert.deepEqual(fs.readdirSync(existing), []);
  assert.match(caught?.message ?? '', /on-disk path alias.*generated.*Generated/i);
});

void test('atomic write rejects a Unicode-normalization-aliased existing file', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-root-'));
  const declared = 'Caf\u00e9.md';
  const existingName = 'Cafe\u0301.md';
  const existing = path.join(root, existingName);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(existing, 'original\n');
  const originalEntries = fs.readdirSync(root).sort();
  if (originalEntries.includes(declared)) {
    t.skip('filesystem stores the decomposed fixture with NFC spelling');
    return;
  }

  let caught;
  try {
    writeFileAtomic(root, declared, 'replacement\n');
  } catch (error) {
    caught = error;
  }

  assert.equal(fs.readFileSync(existing, 'utf8'), 'original\n');
  assert.deepEqual(fs.readdirSync(root).sort(), originalEntries);
  assert.match(caught?.message ?? '', /on-disk path alias/);
});

void test('atomic write rejects a Unicode-normalization-aliased existing directory', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-root-'));
  const declared = 'Caf\u00e9';
  const existingName = 'Cafe\u0301';
  const existing = path.join(root, existingName);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(existing);
  const originalEntries = fs.readdirSync(root).sort();
  if (originalEntries.includes(declared)) {
    t.skip('filesystem stores the decomposed fixture with NFC spelling');
    return;
  }

  let caught;
  try {
    writeFileAtomic(root, `${declared}/output.md`, 'canonical output\n');
  } catch (error) {
    caught = error;
  }

  assert.deepEqual(fs.readdirSync(root).sort(), originalEntries);
  assert.deepEqual(fs.readdirSync(existing), []);
  assert.match(caught?.message ?? '', /on-disk path alias/);
});

void test('resolve rejects an exact existing component with an additional folded alias', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-root-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'Existing.md'), 'alias\n');
  fs.writeFileSync(path.join(root, 'existing.md'), 'exact\n');
  if (fs.readdirSync(root).length !== 2) {
    t.skip('filesystem does not preserve case-distinct sibling entries');
    return;
  }

  assert.throws(
    () => resolveInside(root, 'existing.md'),
    /on-disk path alias.*existing\.md.*Existing\.md/i,
  );
});

void test('resolve accepts an exactly spelled existing parent and a missing nested target', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-root-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'generated'));

  assert.equal(
    resolveInside(root, 'generated/nested/output.md'),
    path.join(root, 'generated/nested/output.md'),
  );
});

void test('atomic write rejects a symlinked parent that escapes the repository', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-root-'));
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-external-'));
  const escaped = path.join(external, 'escaped.md');
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(external, { recursive: true, force: true });
  });
  fs.symlinkSync(external, path.join(root, 'linked'), 'dir');

  let caught;
  try {
    writeFileAtomic(root, 'linked/escaped.md', 'must stay inside\n');
  } catch (error) {
    caught = error;
  }

  assert.equal(fs.existsSync(escaped), false, 'external file must not be created');
  assert.match(caught?.message ?? '', /symbolic-link component.*linked/);
});

void test('atomic write rejects an internal symbolic-link component', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-root-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'real'));
  fs.symlinkSync('real', path.join(root, 'alias'), 'dir');

  let caught;
  try {
    writeFileAtomic(root, 'alias/output.md', 'canonical output\n');
  } catch (error) {
    caught = error;
  }

  assert.equal(
    fs.existsSync(path.join(root, 'real/output.md')),
    false,
    'aliased physical output must not be created',
  );
  assert.match(caught?.message ?? '', /symbolic-link component.*alias/);
});

void test('atomic write ignores a planted predictable temp symlink', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-root-'));
  const externalRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-external-'));
  const target = path.join(root, 'generated.md');
  const predictableTemp = `${target}.harness-${process.pid}.tmp`;
  const external = path.join(externalRoot, 'sentinel.md');
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(externalRoot, { recursive: true, force: true });
  });
  fs.writeFileSync(external, 'external sentinel\n');
  fs.symlinkSync(external, predictableTemp, 'file');

  writeFileAtomic(root, 'generated.md', 'canonical output\n');

  assert.equal(fs.readFileSync(external, 'utf8'), 'external sentinel\n');
  assert.equal(fs.lstatSync(target).isSymbolicLink(), false);
  assert.equal(fs.lstatSync(target).isFile(), true);
  assert.equal(fs.readFileSync(target, 'utf8'), 'canonical output\n');
  assert.equal(fs.lstatSync(predictableTemp).isSymbolicLink(), true);
  assert.equal(fs.readlinkSync(predictableTemp), external);
});

void test('rejects duplicate target ids', () => {
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          targets: [createTarget(), createTarget({ path: 'CLAUDE.md' })],
        }),
      ),
    /duplicate target id.*root-agents/,
  );
});

void test('rejects duplicate target paths', () => {
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          targets: [createTarget(), createTarget({ id: 'root-claude' })],
        }),
      ),
    /duplicate target path.*AGENTS\.md/,
  );
});

void test('rejects case-only target path collisions', () => {
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          targets: [
            createTarget({
              path: 'generated/Output.md',
            }),
            createTarget({
              id: 'root-claude',
              path: 'generated/output.md',
            }),
          ],
        }),
      ),
    /duplicate target path.*generated\/output\.md.*generated\/Output\.md/i,
  );
});

void test('rejects Unicode case-equivalent NFC target paths', () => {
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          targets: [
            createTarget({
              path: 'generated/CAF\u00c9.md',
            }),
            createTarget({
              id: 'root-claude',
              path: 'generated/caf\u00e9.md',
            }),
          ],
        }),
      ),
    /duplicate target path/,
  );
});

void test('rejects sharp-s expansion target path collisions', () => {
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          targets: [
            createTarget({
              path: 'generated/Stra\u00dfe.md',
            }),
            createTarget({
              id: 'root-claude',
              path: 'generated/STRASSE.md',
            }),
          ],
        }),
      ),
    /duplicate target path.*STRASSE\.md.*Stra\u00dfe\.md/,
  );
});

void test('rejects long-s target path collisions', () => {
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          targets: [
            createTarget({
              path: 'generated/\u017file.md',
            }),
            createTarget({
              id: 'root-claude',
              path: 'generated/Sile.md',
            }),
          ],
        }),
      ),
    /duplicate target path.*Sile\.md.*\u017file\.md/,
  );
});

void test('rejects a non-canonical target path alias', () => {
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          targets: [
            createTarget({ path: 'nested/output.md' }),
            createTarget({ id: 'root-claude', path: 'nested/./output.md' }),
          ],
        }),
      ),
    /normalized repository-relative/,
  );
});

void test('rejects a source repeated within one target', () => {
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          targets: [
            createTarget({
              sources: ['harness/policy/authority.md', 'harness/policy/authority.md'],
            }),
          ],
        }),
      ),
    /duplicate source/,
  );
});

void test('rejects a self-sourced target that would change across generation passes', () => {
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          targets: [
            createTarget({
              path: 'generated/policy.md',
              sources: ['generated/policy.md'],
            }),
          ],
        }),
      ),
    /registered input target root-agents source generated\/policy\.md aliases generated target path generated\/policy\.md/,
  );
});

void test('rejects the manifest itself as an exact generated target', () => {
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          targets: [createTarget({ path: 'harness/manifest.json' })],
        }),
      ),
    /registered input manifest harness\/manifest\.json aliases generated target path harness\/manifest\.json/,
  );
});

void test('rejects a case and Unicode portable alias of the manifest as a target', () => {
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          targets: [createTarget({ path: 'Harness/Manife\u017ft.json' })],
        }),
      ),
    /registered input manifest harness\/manifest\.json aliases generated target path Harness\/Manife\u017ft\.json/,
  );
});

void test('rejects portable target aliases across every registered input class', () => {
  const targetPath = 'Generated/Caf\u00e9.md';
  const inputAlias = 'generated/CAF\u00c9.md';
  const persona = {
    id: 'sarah',
    description: 'Orchestration lead',
    source: inputAlias,
    claudeTools: 'Read, Grep, Glob',
    claudeModel: 'inherit',
  };
  const cases = [
    {
      label: 'target root-agents template',
      overrides: { targets: [createTarget({ path: targetPath, template: inputAlias })] },
    },
    {
      label: 'target root-agents source',
      overrides: { targets: [createTarget({ path: targetPath, sources: [inputAlias] })] },
    },
    {
      label: 'policyOrder',
      overrides: { targets: [createTarget({ path: targetPath })], policyOrder: [inputAlias] },
    },
    {
      label: 'persona sarah source',
      overrides: { targets: [createTarget({ path: targetPath })], personas: [persona] },
    },
    {
      label: 'rules',
      overrides: { targets: [createTarget({ path: targetPath })], rules: inputAlias },
    },
    {
      label: 'workflow machine',
      overrides: {
        targets: [createTarget({ path: targetPath })],
        workflow: { machine: inputAlias },
      },
    },
  ];

  for (const fixture of cases) {
    assert.throws(
      () => validateManifest(createManifest(fixture.overrides)),
      new RegExp(
        `registered input ${fixture.label} .* aliases generated target path Generated/Caf`,
      ),
    );
  }
});

void test('requires a non-empty safe workflow machine path', () => {
  for (const machine of [undefined, '']) {
    assert.throws(
      () => validateManifest(createManifest({ workflow: { machine } })),
      /workflow\.machine must be a non-empty string/,
    );
  }
  assert.throws(
    () =>
      validateManifest(createManifest({ workflow: { machine: '../workflow/state_machine.json' } })),
    /repository-relative/,
  );
});

void test('requires the exact bounded task graph manifest contract', () => {
  const manifest = createManifest();
  assert.deepEqual(manifest.workflow.tasks, {
    directory: 'docs/superpowers/task-graphs',
    limits: {
      maxTasks: 40,
      maxDependencies: 12,
      maxReadPaths: 24,
      maxWritePaths: 16,
      maxAcceptanceCriteria: 12,
      maxVerificationCommands: 8,
      maxTaskTextBytes: 8192,
      maxPacketBytes: 24576,
    },
  });
  assert.doesNotThrow(() => validateManifest(manifest));

  for (const tasks of [
    undefined,
    {},
    { ...manifest.workflow.tasks, directory: '../task-graphs' },
    {
      ...manifest.workflow.tasks,
      limits: { ...manifest.workflow.tasks.limits, maxTasks: 0 },
    },
    {
      ...manifest.workflow.tasks,
      limits: {
        ...manifest.workflow.tasks.limits,
        maxPacketBytes: manifest.workflow.tasks.limits.maxTaskTextBytes - 1,
      },
    },
  ]) {
    assert.throws(() =>
      validateManifest(
        createManifest({
          workflow: { ...manifest.workflow, tasks },
        }),
      ),
    );
  }
});

void test('requires rules to be a non-empty safe repository-relative path', () => {
  for (const rules of [undefined, '']) {
    assert.throws(
      () => validateManifest(createManifest({ rules })),
      /rules must be a non-empty string/,
    );
  }
  assert.throws(
    () => validateManifest(createManifest({ rules: '../semantics.json' })),
    /repository-relative/,
  );
});

void test('requires the version and manifest collections', () => {
  assert.throws(() => validateManifest(createManifest({ version: 2 })), /version must be 1/);
  assert.throws(
    () => validateManifest(createManifest({ policyOrder: undefined })),
    /policyOrder must be an array/,
  );
  assert.throws(() => validateManifest(createManifest({ targets: undefined })), /targets/);
  assert.throws(() => validateManifest(createManifest({ personas: undefined })), /personas/);
  assert.throws(
    () => validateManifest(createManifest({ verification: undefined })),
    /verification\.checks/,
  );
});

void test('rejects duplicate policy order entries', () => {
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          policyOrder: ['harness/policy/authority.md', 'harness/policy/authority.md'],
        }),
      ),
    /duplicate policyOrder entry/,
  );
});

void test('rejects unsafe policy order entries', () => {
  for (const policyPath of ['../authority.md', '/tmp/authority.md']) {
    assert.throws(
      () => validateManifest(createManifest({ policyOrder: [policyPath] })),
      /repository-relative/,
    );
  }
});

void test('requires repository-relative target inputs', () => {
  for (const target of [
    createTarget({ path: '../AGENTS.md' }),
    createTarget({ template: '/tmp/agents.md' }),
    createTarget({ sources: ['harness/policy/../authority.md'] }),
  ]) {
    assert.throws(
      () => validateManifest(createManifest({ targets: [target] })),
      /repository-relative/,
    );
  }
});

void test('requires target sources to be an array', () => {
  assert.throws(
    () => validateManifest(createManifest({ targets: [createTarget({ sources: undefined })] })),
    /target root-agents sources must be an array/,
  );
});

void test('requires each target to be a non-null object', () => {
  for (const target of [null, [], 'AGENTS.md']) {
    assert.throws(
      () => validateManifest(createManifest({ targets: [target] })),
      /target 0 must be an object/,
    );
  }
});

void test('requires non-empty string target fields', () => {
  for (const key of ['id', 'path', 'template']) {
    for (const value of ['', 42]) {
      assert.throws(
        () =>
          validateManifest(
            createManifest({
              targets: [createTarget({ [key]: value })],
            }),
          ),
        new RegExp(`target 0 ${key} must be a non-empty string`),
      );
    }
  }
});

void test('accepts a complete unique persona', () => {
  assert.doesNotThrow(() =>
    validateManifest(
      createManifest({
        personas: [
          {
            id: 'sarah',
            description: 'Orchestration lead',
            source: 'harness/personas/sarah.md',
            claudeTools: 'Read, Grep, Glob',
            claudeModel: 'inherit',
          },
        ],
      }),
    ),
  );
});

void test('rejects duplicate or incomplete personas', () => {
  const persona = {
    id: 'sarah',
    description: 'Orchestration lead',
    source: 'harness/personas/sarah.md',
    claudeTools: 'Read, Grep, Glob',
    claudeModel: 'inherit',
  };

  assert.throws(
    () => validateManifest(createManifest({ personas: [persona, { ...persona }] })),
    /duplicate persona/,
  );
  for (const key of ['id', 'description', 'claudeTools', 'claudeModel']) {
    assert.throws(
      () =>
        validateManifest(
          createManifest({
            personas: [{ ...persona, [key]: '' }],
          }),
        ),
      new RegExp(`missing ${key}`),
    );
  }
  assert.throws(
    () =>
      validateManifest(
        createManifest({
          personas: [{ ...persona, source: '../sarah.md' }],
        }),
      ),
    /repository-relative/,
  );
});

void test('load rejects a missing registered rules file', (t) => {
  const root = createManifestRoot(
    t,
    createManifest({
      rules: 'harness/rules/missing.json',
    }),
  );

  assert.throws(() => loadManifest(root), /missing registered input.*missing\.json/);
});

void test('load rejects a missing registered workflow machine', (t) => {
  const manifest = createManifest();
  const root = createManifestRoot(t, manifest);
  writeFixture(root, manifest.rules, '{"rules":[]}');
  fs.unlinkSync(path.join(root, manifest.workflow.machine));

  assert.throws(() => loadManifest(root), /missing registered input.*state_machine\.json/);
});

void test('load rejects a missing registered policy order input', (t) => {
  const root = createManifestRoot(
    t,
    createManifest({
      policyOrder: ['harness/policy/authority.md'],
      rules: 'harness/rules/semantics.json',
    }),
  );
  writeFixture(root, 'harness/rules/semantics.json', '{"rules":[]}');

  assert.throws(() => loadManifest(root), /missing registered input.*authority\.md/);
});

void test('load rejects a registered input through an escaping symlink', (t) => {
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-external-'));
  t.after(() => fs.rmSync(external, { recursive: true, force: true }));
  const root = createManifestRoot(
    t,
    createManifest({
      rules: 'linked/semantics.json',
    }),
  );
  writeFixture(external, 'semantics.json', '{"rules":[]}');
  fs.symlinkSync(external, path.join(root, 'linked'), 'dir');

  assert.throws(() => loadManifest(root), /symbolic-link component.*linked/);
});

void test('load rejects target paths aliased by an internal symbolic link', (t) => {
  const root = createManifestRoot(
    t,
    createManifest({
      rules: 'harness/rules/semantics.json',
      targets: [
        createTarget({
          id: 'real-target',
          path: 'real/output.md',
          sources: [],
        }),
        createTarget({
          id: 'alias-target',
          path: 'alias/output.md',
          sources: [],
        }),
      ],
    }),
  );
  writeFixture(root, 'harness/rules/semantics.json', '{"rules":[]}');
  writeFixture(root, 'harness/templates/agents.md');
  fs.mkdirSync(path.join(root, 'real'));
  fs.symlinkSync('real', path.join(root, 'alias'), 'dir');

  assert.throws(() => loadManifest(root), /symbolic-link component.*alias/);
});

void test('load accepts an ordinary nonexistent nested target path', (t) => {
  const root = createManifestRoot(
    t,
    createManifest({
      rules: 'harness/rules/semantics.json',
      targets: [
        createTarget({
          path: 'generated/nested/output.md',
          sources: [],
        }),
      ],
    }),
  );
  writeFixture(
    root,
    'harness/rules/semantics.json',
    fs.readFileSync(path.join(repositoryRoot, 'harness/rules/semantics.json'), 'utf8'),
  );
  writeFixture(root, 'harness/templates/agents.md');

  assert.doesNotThrow(() => loadManifest(root));
});

void test('load rejects a target path with a case-aliased existing component', (t) => {
  const root = createManifestRoot(
    t,
    createManifest({
      rules: 'harness/rules/semantics.json',
      targets: [
        createTarget({
          path: 'existing.md',
          sources: [],
        }),
      ],
    }),
  );
  writeFixture(root, 'harness/rules/semantics.json', '{"rules":[]}');
  writeFixture(root, 'harness/templates/agents.md');
  writeFixture(root, 'Existing.md', 'original\n');
  const originalEntries = fs.readdirSync(root).sort();

  assert.throws(() => loadManifest(root), /on-disk path alias.*existing\.md.*Existing\.md/i);
  assert.equal(fs.readFileSync(path.join(root, 'Existing.md'), 'utf8'), 'original\n');
  assert.deepEqual(fs.readdirSync(root).sort(), originalEntries);
});

void test('load rejects a missing registered template', (t) => {
  const root = createManifestRoot(
    t,
    createManifest({
      rules: 'harness/rules/semantics.json',
      targets: [createTarget({ sources: [] })],
    }),
  );
  writeFixture(root, 'harness/rules/semantics.json', '{"rules":[]}');

  assert.throws(() => loadManifest(root), /missing registered input.*agents\.md/);
});

void test('load rejects a missing registered source', (t) => {
  const root = createManifestRoot(
    t,
    createManifest({
      rules: 'harness/rules/semantics.json',
      targets: [createTarget()],
    }),
  );
  writeFixture(root, 'harness/rules/semantics.json', '{"rules":[]}');
  writeFixture(root, 'harness/templates/agents.md');

  assert.throws(() => loadManifest(root), /missing registered input.*authority\.md/);
});
