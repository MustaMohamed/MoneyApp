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
 * The `(-?)` capture and the `${sign}` it re-emits are unreachable from either
 * sheet prefill — `spending_plan_categories.allocated_amount` carries
 * `CHECK(allocated_amount IS NULL OR allocated_amount >= 0)` and
 * `spending_plans.total_amount` carries `CHECK(total_amount > 0)`
 * (`migrations/014_create_spending_plans.ts:9`, `:18`) — but the branch is not
 * dead: this is a plain string utility any future caller can reach.
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
 * Edit-mode prefill: the initial field text for a stored money value — an
 * allocation row, and the plan total that shares the sheet with it. Never
 * rounds and never formats for display — this text is re-parsed by the same
 * validator a typed value goes through, so it has to equal what the database
 * actually holds rather than a display approximation of it. A stored `0.005`
 * therefore prefills as `'0.005'` and fails the row's floor check, where
 * `formatAmount(x, 2)` would render `'0.01'` and silently substitute a value
 * nobody entered.
 *
 * It also has to survive the keystroke mask, which runs on `onChangeText` and
 * never on a programmatic prefill: `String(1e21)` is `'1e+21'`, the mask
 * refuses it, and the field it prefilled cannot be backspaced. Hence the
 * expansion above rather than a bare `String(value)`.
 *
 * `null`/`undefined` render as `''` — unallocated, never `'0'`. Only the
 * allocation column can deliver either; `spending_plans.total_amount` is
 * `NOT NULL`, so the plan total never takes that branch.
 */
export function formatStoredMoneyText(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return expandExponentialNotation(String(value));
}

/**
 * The keystroke rule for a form field that may or may not hold money. A name
 * field is never masked, whatever the text; an amount field gets exactly
 * `isTypeableMoneyText`'s verdict, with no truncation and no second
 * normalisation layered on top.
 *
 * It takes the field's own `variant` rather than a boolean the caller derives,
 * because the trap it closes is a shared component: `SpendingPlanField` renders
 * both the plan name and the plan total through one `onChangeText`, so a mask
 * applied there unconditionally would refuse every letter of a plan name with
 * nothing on screen to say why. A call site that passes its `variant` straight
 * through cannot get that wrong; a call site that computed a boolean could, and
 * no test of this predicate would see it.
 *
 * `setAllocationText` deliberately keeps calling `isTypeableMoneyText`
 * directly — it has no variant, and inventing one for it would be an
 * abstraction with a single fake caller.
 */
export function acceptsMoneyFieldText(variant: 'name' | 'amount', text: string): boolean {
  return variant === 'name' || isTypeableMoneyText(text);
}
