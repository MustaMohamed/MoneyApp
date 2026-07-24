const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { extractSection, renderTarget } = require('../lib/render');

void test('extracts one named persona section', () => {
  const source = [
    '# Dev',
    '<!-- harness:section agent -->',
    'Agent body.',
    '<!-- harness:endsection -->',
    '<!-- harness:section inline -->',
    'Inline body.',
    '<!-- harness:endsection -->',
    '',
  ].join('\n');
  assert.equal(extractSection(source, 'inline'), 'Inline body.\n');
});

void test('rejects duplicate named persona sections', () => {
  const source = [
    '<!-- harness:section inline -->',
    'First body.',
    '<!-- harness:endsection -->',
    '<!-- harness:section inline -->',
    'Second body.',
    '<!-- harness:endsection -->',
    '',
  ].join('\n');

  assert.throws(() => extractSection(source, 'inline'), /duplicate section: inline/);
});

void test('rejects nested persona sections', () => {
  const source = [
    '<!-- harness:section inline -->',
    'Inline body.',
    '<!-- harness:section agent -->',
    'Agent body.',
    '<!-- harness:endsection -->',
    '<!-- harness:endsection -->',
    '',
  ].join('\n');

  assert.throws(() => extractSection(source, 'inline'), /nested section: agent/);
});

void test('rejects a stray persona end marker', () => {
  const source = ['# Dev', '<!-- harness:endsection -->', ''].join('\n');

  assert.throws(() => extractSection(source, 'inline'), /unexpected end section/);
});

void test('rejects a repeated persona end marker', () => {
  const source = [
    '<!-- harness:section inline -->',
    'Inline body.',
    '<!-- harness:endsection -->',
    '<!-- harness:endsection -->',
    '',
  ].join('\n');

  assert.throws(() => extractSection(source, 'inline'), /unexpected end section/);
});

void test('rejects a persona section missing its end marker', () => {
  const source = ['<!-- harness:section inline -->', 'Inline body.', ''].join('\n');

  assert.throws(() => extractSection(source, 'inline'), /missing end section: inline/);
});

void test('rejects a malformed persona end marker', () => {
  const source = [
    '<!-- harness:section inline -->',
    'Inline body.',
    '<!-- harness:endsection ->',
    '',
  ].join('\n');

  assert.throws(() => extractSection(source, 'inline'), /malformed section marker/);
});

void test('renders declared includes and escaped JSON variables', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/source.md'), 'Policy body.\n');
  fs.writeFileSync(
    path.join(root, 'harness/template.md'),
    '{{raw:notice}}\n{{json:description}}\n{{include:harness/source.md}}',
  );

  const output = renderTarget(root, 'NOTICE', {
    id: 'target',
    template: 'harness/template.md',
    sources: ['harness/source.md'],
    variables: { description: 'A "quoted" description' },
  });

  assert.equal(output, 'NOTICE\n"A \\"quoted\\" description"\nPolicy body.\n');
});

void test('uses the global generated notice when target variables contain notice', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/template.md'), '{{raw:notice}}');

  const output = renderTarget(root, 'GLOBAL NOTICE', {
    id: 'reserved-notice',
    template: 'harness/template.md',
    sources: [],
    variables: { notice: 'TARGET NOTICE' },
  });

  assert.equal(output, 'GLOBAL NOTICE\n');
});

void test('rejects a declared source omitted from the template', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/source.md'), 'Policy body.\n');
  fs.writeFileSync(path.join(root, 'harness/template.md'), '{{raw:notice}}');

  assert.throws(
    () =>
      renderTarget(root, 'NOTICE', {
        id: 'omitted-source',
        template: 'harness/template.md',
        sources: ['harness/source.md'],
        variables: {},
      }),
    /omitted-source: missing include harness\/source\.md/,
  );
});

void test('rejects undeclared includes and unresolved placeholders', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/template.md'), '{{include:harness/secret.md}}');
  fs.writeFileSync(path.join(root, 'harness/secret.md'), 'secret');

  assert.throws(
    () =>
      renderTarget(root, 'NOTICE', {
        id: 'target',
        template: 'harness/template.md',
        sources: [],
        variables: {},
      }),
    /undeclared include/,
  );
});

void test('rejects repeated canonical includes in one target', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/source.md'), 'Policy.\n');
  fs.writeFileSync(
    path.join(root, 'harness/template.md'),
    '{{include:harness/source.md}}{{include:harness/source.md}}',
  );
  assert.throws(
    () =>
      renderTarget(root, 'NOTICE', {
        id: 'duplicate',
        template: 'harness/template.md',
        sources: ['harness/source.md'],
        variables: {},
      }),
    /duplicate include/,
  );
});

void test('rejects unsupported placeholder modes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/template.md'), '{{yaml:description}}');
  assert.throws(
    () =>
      renderTarget(root, 'NOTICE', {
        id: 'unsupported',
        template: 'harness/template.md',
        sources: [],
        variables: { description: 'value' },
      }),
    /unsupported: unresolved placeholder/,
  );
});

void test('rejects an empty placeholder with the target id', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/template.md'), '{{}}');

  assert.throws(
    () =>
      renderTarget(root, 'NOTICE', {
        id: 'empty-placeholder',
        template: 'harness/template.md',
        sources: [],
        variables: {},
      }),
    /empty-placeholder: unresolved placeholder/,
  );
});

void test('keeps placeholder-looking canonical source content literal', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/source.md'), 'Literal {{raw:notice}}.\n');
  fs.writeFileSync(path.join(root, 'harness/template.md'), '{{include:harness/source.md}}');

  const output = renderTarget(root, 'NOTICE', {
    id: 'literal-source',
    template: 'harness/template.md',
    sources: ['harness/source.md'],
    variables: {},
  });

  assert.equal(output, 'Literal {{raw:notice}}.\n');
});

void test('keeps placeholder-looking variable content literal', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/template.md'), '{{raw:description}}');

  const output = renderTarget(root, 'NOTICE', {
    id: 'literal-variable',
    template: 'harness/template.md',
    sources: [],
    variables: { description: 'Literal {{raw:notice}}.' },
  });

  assert.equal(output, 'Literal {{raw:notice}}.\n');
});

void test('rejects a malformed template placeholder with the target id', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });

  for (const template of ['{{raw:notice}', '{{raw:notice}suffix}}']) {
    fs.writeFileSync(path.join(root, 'harness/template.md'), template);
    assert.throws(
      () =>
        renderTarget(root, 'NOTICE', {
          id: 'malformed-placeholder',
          template: 'harness/template.md',
          sources: [],
          variables: {},
        }),
      /malformed-placeholder: unresolved placeholder/,
    );
  }
});
