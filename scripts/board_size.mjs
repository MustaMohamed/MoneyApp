// The Size line of an issue body: its file count, its planned lines and the paths it names after `at <sha>: `.
/** @param {string | null | undefined} body @returns {null | { unparsed: true } | { files: number, lines: number, paths: string[] }} */
export function bodySize(body) {
  const line = (body ?? '')
    .split('\n')
    .filter((l) => /^\s*-\s*Size: /.test(l))
    .pop();
  if (!line) return null;
  const files = /Size: (\d+) files?/.exec(line);
  const span = /Size: \d+ files?[^,]*, ([^,]*) lines/.exec(line);
  const lines = span ? [...span[1].matchAll(/\d+/g)].map((x) => Number(x[0])) : [];
  if (!files || lines.length === 0) return { unparsed: true };
  const named = / at `?[0-9a-f]{7,40}`?[^:]*: (.*)$/.exec(line.trimEnd());
  const paths = named
    ? named[1]
        .split(';')[0]
        .split(', ')
        .map((p) => p.replaceAll('`', '').trim())
        .filter(Boolean)
    : [];
  return { files: Number(files[1]), lines: Math.max(...lines), paths };
}
