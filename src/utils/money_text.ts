/**
 * Expands `Number.prototype.toString()`'s exponential form (`'1e-7'`,
 * `'1.5e+21'`) into plain positional notation, using only the digits
 * `toString()` already emitted. It repositions the decimal point and adds no
 * digit and drops no digit, so it cannot introduce float-representation noise
 * that was not already in the shortest round-trip string — which is why the
 * expansion is string surgery rather than a `toFixed`/`toLocaleString`
 * recomputation.
 *
 * The `(-?)` capture and the `${sign}` it re-emits carry no prefill today, but
 * that is no longer a claim the schema can carry on its own. Four prefills now
 * reach this function and only three of their sources forbid a negative in
 * SQL:
 *
 * - `spending_plan_categories.allocated_amount` —
 *   `CHECK(allocated_amount IS NULL OR allocated_amount >= 0)`
 *   (`migrations/014_create_spending_plans.ts:18`)
 * - `spending_plans.total_amount` — `CHECK(total_amount > 0)` (`014:9`)
 * - `budget_month_settings.expected_income` —
 *   `CHECK(typeof(...) AND expected_income > 0 AND <= 9007199254740991)`
 *   (`migrations/016_create_budget_month_profiles.ts:6-10`)
 * - `budgets.limit_amount` — `REAL NOT NULL`, **no CHECK**
 *   (`migrations/013_named_monthly_budgets.ts:8`)
 *
 * On the fourth, and on the income sheet's other input — a suggestion averaged
 * over `transactions.egp_amount`, itself a bare `REAL NOT NULL` (`004:9`) — the
 * only thing excluding a negative is `parsePositiveDecimal` at the form, which
 * is an application guard every non-form writer bypasses. So the branch stays
 * for the reason it is written, not as decoration: the proof narrowed when the
 * domain grew, and a plain string utility any future caller can reach should
 * not lose a correct branch to an argument that now covers half its callers.
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
 * Edit-mode prefill: the initial field text for a stored money value. Four
 * callers as of MA-020 c3 — an allocation row, the plan total that shares the
 * sheet with it, the monthly income amount, and a budget's monthly limit; the
 * rule is that every money field prefills through here rather than through
 * `String(value)`, because `String` can emit a form no money field can parse.
 *
 * Never rounds and never formats for display — this text is re-parsed by the
 * same validator a typed value goes through, so it has to equal what the
 * database actually holds rather than a display approximation of it. A stored
 * `0.005` therefore prefills as `'0.005'` and fails the row's floor check, where
 * `formatAmount(x, 2)` would render `'0.01'` and silently substitute a value
 * nobody entered.
 *
 * The other form it must not emit is the exponent one, and that is what the
 * expansion above is for.
 * `String(1e21)` is `'1e+21'` and `String(1e-7)` is `'1e-7'`; both are
 * unparseable by `DECIMAL_PATTERN`, so a field prefilled from a bare
 * `String(value)` opens holding text its own validator rejects — a stored value
 * the user never entered and cannot save back. The expansion is what makes the
 * prefill re-parse to the number it came from.
 *
 * `null`/`undefined` render as `''` — unallocated, never `'0'`. Two callers
 * reach that branch: the allocation column, which is nullable, and the income
 * sheet, whose `currentIncome ?? suggestion` is `null` on a month with neither.
 * `spending_plans.total_amount` and `budgets.limit_amount` are both `NOT NULL`
 * and their sheets prefill only in edit mode, so neither takes it.
 */
export function formatStoredMoneyText(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return expandExponentialNotation(String(value));
}
