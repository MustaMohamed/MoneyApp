import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  path.join(__dirname, '..', '..', 'scripts', 'board_issue.mjs'),
).href;

const LT = '\uE000';
const ESCAPED_LT = '\uE001';

function driver<T>(expression: string): T {
  const code = `
import { issueArgs, issueNumber, MARKDOWN_ARGS, markdownInput, maskAngles, unmaskAngles } from ${JSON.stringify(moduleUrl)};
process.stdout.write(JSON.stringify(${expression}));
`;
  const r = spawnSync('node', ['--input-type=module', '-e', code], { encoding: 'utf8' });
  expect(r.stderr).toBe('');
  expect(r.status).toBe(0);
  return JSON.parse(r.stdout) as T;
}

describe('the ticket body the board page may ask for', () => {
  test('only a plain issue number is taken', () => {
    const raws = [
      '448',
      '1',
      '9999999',
      '0',
      '012',
      '-3',
      '4.5',
      '448 ',
      '448/comments',
      '../1',
      '',
    ];
    expect(driver<Array<number | null>>(`${JSON.stringify(raws)}.map(issueNumber)`)).toEqual([
      448,
      1,
      9999999,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(driver<Array<number | null>>('[null, undefined, 448].map(issueNumber)')).toEqual([
      null,
      null,
      null,
    ]);
  });

  test('the read is one REST call for that issue, and the render one more with the body on stdin', () => {
    expect(driver<string[]>('issueArgs(448)')).toEqual([
      'api',
      'repos/MustaMohamed/MoneyApp/issues/448',
    ]);
    expect(driver<string[]>('MARKDOWN_ARGS')).toEqual(['api', 'markdown', '--input', '-']);
    expect(driver<string>('markdownInput("See #12 and <Month>")')).toBe(
      JSON.stringify({
        text: `See #12 and ${LT}Month>`,
        mode: 'gfm',
        context: 'MustaMohamed/MoneyApp',
      }),
    );
  });
});

describe('a < on its way through the renderer', () => {
  test.each([
    ['a placeholder', 'in <Month>, <amount> <code>', `in ${LT}Month>, ${LT}amount> ${LT}code>`],
    ['a raw tag', 'a <details>b</details>', `a ${LT}details>b${LT}/details>`],
    ['a comparison', 'when a < b', `when a ${LT} b`],
    ['a code span, masked like prose', 'the `<name>` field', `the \`${LT}name>\` field`],
    [
      'a fence under a bullet, masked like prose',
      '- a\n\n    ```ts\n    const a: Array<string> = [];\n    ```',
      `- a\n\n    \`\`\`ts\n    const a: Array${LT}string> = [];\n    \`\`\``,
    ],
    ['a backslash before it', 'a \\<Month> b', `a ${ESCAPED_LT}Month> b`],
    [
      'an autolink, left alone',
      'see <https://example.com/a?b=1>',
      'see <https://example.com/a?b=1>',
    ],
    ['a stray mask character in the body, removed', `a ${LT}b${ESCAPED_LT}c`, 'a bc'],
    ['no body', null, ''],
  ])('%s', (_, markdown, expected) => {
    expect(driver<string>(`maskAngles(${JSON.stringify(markdown)})`)).toBe(expected);
  });

  test.each([
    ['prose', `<p>in ${LT}Month&gt; when a ${LT} b</p>`, '<p>in &lt;Month&gt; when a &lt; b</p>'],
    [
      'a code span and a highlighted block',
      `<code class="notranslate">${LT}name&gt;</code><pre class="notranslate"><span>Array${LT}string</span></pre>`,
      '<code class="notranslate">&lt;name&gt;</code><pre class="notranslate"><span>Array&lt;string</span></pre>',
    ],
    [
      'an escaped one loses its backslash in prose and keeps it in code',
      `<p>a ${ESCAPED_LT}b</p><pre>grep "${ESCAPED_LT}word"</pre><p><code>x${ESCAPED_LT}y</code> ${ESCAPED_LT}z</p>`,
      '<p>a &lt;b</p><pre>grep "\\&lt;word"</pre><p><code>x\\&lt;y</code> &lt;z</p>',
    ],
    [
      'one the linker took into a URL',
      `<a href="https://example.com/%EE%80%80id%3E">https://example.com/${LT}id&gt;</a>`,
      '<a href="https://example.com/%3Cid%3E">https://example.com/&lt;id&gt;</a>',
    ],
  ])('comes back as text: %s', (_, html, expected) => {
    expect(driver<string>(`unmaskAngles(${JSON.stringify(html)})`)).toBe(expected);
  });
});
