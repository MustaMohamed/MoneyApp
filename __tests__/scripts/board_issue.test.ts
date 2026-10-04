import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  path.join(__dirname, '..', '..', 'scripts', 'board_issue.mjs'),
).href;

function driver<T>(expression: string): T {
  const code = `
import { issueArgs, issueNumber, issueView, keepPlaceholders, MARKDOWN_ARGS, markdownInput } from ${JSON.stringify(moduleUrl)};
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
        text: 'See #12 and &lt;Month>',
        mode: 'gfm',
        context: 'MustaMohamed/MoneyApp',
      }),
    );
  });

  test.each([
    [
      'a placeholder goes in as text',
      'Nothing recorded in <Month>, <amount> <code>',
      'Nothing recorded in &lt;Month>, &lt;amount> &lt;code>',
    ],
    ['a raw tag goes in as text too', 'a <details>b</details>', 'a &lt;details>b&lt;/details>'],
    ['a comparison is kept', 'when a < b', 'when a &lt; b'],
    [
      'a code span is left alone',
      'the `<name>` field and ``a ` <b>``',
      'the `<name>` field and ``a ` <b>``',
    ],
    ['text after a code span is still escaped', '`x` then <y>', '`x` then &lt;y>'],
    [
      'an autolink is left alone',
      'see <https://example.com/a?b=1>',
      'see <https://example.com/a?b=1>',
    ],
    [
      'a fenced block is left alone',
      'a <x>\n```ts\nconst a = <T>() => 1;\n```\nb <y>',
      'a &lt;x>\n```ts\nconst a = <T>() => 1;\n```\nb &lt;y>',
    ],
    [
      'a longer fence closes only on its own length',
      '````\n```\n<in>\n````\n<out>',
      '````\n```\n<in>\n````\n&lt;out>',
    ],
    ['a tilde fence is a fence', '~~~\n<in>\n~~~\n<out>', '~~~\n<in>\n~~~\n&lt;out>'],
    ['no body reads as empty', null, ''],
  ])('%s', (_, markdown, expected) => {
    expect(driver<string>(`keepPlaceholders(${JSON.stringify(markdown)})`)).toBe(expected);
  });

  test('the page gets the rendered body and the fields its header shows, nothing else', () => {
    const api = {
      number: 448,
      title: 'MA-047 — A title',
      state: 'open',
      html_url: 'https://github.com/MustaMohamed/MoneyApp/issues/448',
      updated_at: '2026-10-04T14:28:45Z',
      body: '## Raw',
      user: { login: 'someone' },
    };
    expect(
      driver<Record<string, unknown>>(`issueView(${JSON.stringify(api)}, '<h2>Rendered</h2>')`),
    ).toEqual({
      number: 448,
      title: 'MA-047 — A title',
      state: 'open',
      url: 'https://github.com/MustaMohamed/MoneyApp/issues/448',
      updatedAt: '2026-10-04T14:28:45Z',
      isPull: false,
      html: '<h2>Rendered</h2>',
    });
  });

  test('a pull request number is told apart from an issue', () => {
    const view = driver<{ html: string; isPull: boolean }>(
      'issueView({ number: 7, pull_request: { url: "x" } }, "")',
    );
    expect([view.html, view.isPull]).toEqual(['', true]);
  });
});
