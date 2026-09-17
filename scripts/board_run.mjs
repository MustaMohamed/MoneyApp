// The only commands the board page may run: board.sh status, promote and add, with literal arguments. Anything else is copied, never executed.
export const STATUSES = [
  'Todo',
  'Defined',
  'Ready For Development',
  'Planned',
  'In Progress',
  'In Review',
  'Awaiting Human',
  'Blocked',
  'Done',
];

const PART = [
  [
    /^bash scripts\/board\.sh status (\d+) (?:"([A-Za-z ]+)"|([A-Za-z]+))$/,
    (m) => ['status', m[1], m[2] ?? m[3]],
  ],
  [/^bash scripts\/board\.sh promote (\d+)$/, (m) => ['promote', m[1]]],
  [/^bash scripts\/board\.sh add (\d+)$/, (m) => ['add', m[1]]],
];

// Returns one argv per chained part, or null when any part is outside the whitelist.
/** @param {unknown} command @returns {string[][] | null} */
export function parseRunnable(command) {
  if (typeof command !== 'string' || command.length > 200) return null;
  /** @type {string[][]} */
  const out = [];
  for (const part of command.split(' && ')) {
    const hit = PART.map(([re, to]) => [re.exec(part), to]).find(([m]) => m);
    if (!hit) return null;
    const argv = hit[1](hit[0]);
    if (argv[0] === 'status' && !STATUSES.includes(argv[2])) return null;
    out.push(argv);
  }
  return out.length ? out : null;
}
