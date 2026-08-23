/**
 * Whether `text` is something the user can be part-way through typing into a
 * money field: digits, at most one decimal point, nothing else.
 *
 * It gates characters and never truncates a value — no 2dp cap, no
 * leading-zero insertion, no `.` normalisation, no comma stripping. `'0.005'`
 * has to reach the row validator and produce a legible floor message rather
 * than being silently rounded into `'0.00'`, and `'1,500'` has to be refused
 * outright rather than quietly parsed as 1500.
 */
export function isTypeableMoneyText(text: string): boolean {
  return /^\d*\.?\d*$/.test(text);
}

/**
 * Expands `Number.prototype.toString()`'s exponential form (`'1e-7'`,
 * `'1.5e+21'`) into plain positional notation, using only the digits
 * `toString()` already emitted. It repositions the decimal point and adds no
 * digit and drops no digit, so it cannot introduce float-representation noise
 * that was not already in the shortest round-trip string — which is why the
 * expansion is string surgery rather than a `toFixed`/`toLocaleString`
 * recomputation.
 *
 * The `(-?)` capture and the `${sign}` it re-emits are unreachable from the
 * allocation prefill — `spending_plan_categories.allocated_amount` carries
 * `CHECK(allocated_amount IS NULL OR allocated_amount >= 0)` — but the branch
 * is not dead: this is a plain string utility any future caller can reach.
 */
function expandExponentialNotation(text: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/i.exec(text);
  if (!match) return text;
  const [, sign, intPart, fracPart = '', expPart] = match;
  const exp = Number(expPart);
  const digits = intPart + fracPart;
  const pointIndex = intPart.length + exp;
  if (pointIndex <= 0) return `${sign}0.${'0'.repeat(-pointIndex)}${digits}`;
  if (pointIndex >= digits.length) {
    return `${sign}${digits}${'0'.repeat(pointIndex - digits.length)}`;
  }
  return `${sign}${digits.slice(0, pointIndex)}.${digits.slice(pointIndex)}`;
}

/**
 * Edit-mode prefill: the initial field text for a stored allocation. Never
 * rounds and never formats for display — this text is re-parsed by the same
 * row validator a typed value goes through, so it has to equal what the
 * database actually holds rather than a display approximation of it. A stored
 * `0.005` therefore prefills as `'0.005'` and fails the row's floor check,
 * where `formatAmount(x, 2)` would render `'0.01'` and silently substitute a
 * value nobody entered.
 *
 * `null`/`undefined` render as `''` — unallocated, never `'0'`.
 */
export function formatStoredAllocationText(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return expandExponentialNotation(String(value));
}
