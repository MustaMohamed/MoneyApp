/**
 * Whether `text` is something the user can be part-way through typing into a
 * money field: digits, at most one decimal point, nothing else.
 *
 * It gates characters and never truncates a value — no 2dp cap, no
 * leading-zero insertion, no rounding, no whitespace trimming. `'0.005'` has to
 * reach the row validator and produce a legible floor message rather than being
 * silently rounded into `'0.00'`.
 *
 * **It is not the field mask.** `maskMoneyFieldText` below is, and this is step
 * C of it: the predicate that runs on the *rewritten candidate* once the
 * delivery has been classified. That distinction is the whole of what MA-020's
 * Q9 revert was about — as a whole-string mask this refuses `'1,'` outright,
 * which turns the keystrokes `1` `,` `5` `0` into `'150'` on a keyboard whose
 * separator key is the comma. What survives unchanged is its body, because the
 * one thing it has to do here it already did: it permits **at most one** `.` in
 * the whole string, so a second separator — comma or period, in either order —
 * is refused by the pattern rather than by any inference about which glyph the
 * keyboard drew.
 *
 * Its other job is the prefill property (`formatStoredMoneyText` below): every
 * prefix of a prefill has to satisfy this, or the field cannot be backspaced.
 *
 * Precedented verbatim at `decimal_amount_input.tsx:36`, which guards with
 * `v !== '' && …`. That guard is redundant — `\d*` matches the empty string —
 * and is deliberately not reproduced here; recorded so nobody restores it as a
 * missing case.
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
 * is an application guard every non-form writer bypasses. A negative therefore
 * does reach this function, and this branch expands it correctly: `'-1e-7'`
 * becomes `'-0.0000001'`.
 *
 * What it no longer does is change what the caller returns.
 * `formatStoredMoneyText`'s postcondition refuses the expanded string for the
 * same reason it would have refused the unexpanded `'-1e-7'` — neither is text
 * a money field can hold — so both land on `''`. The branch stays because it is
 * correct and this is a plain string utility, not because a caller depends on
 * it; deleting it is a quality call and not a correctness one.
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
 * It also has to survive the keystroke mask, which runs on `onChangeText` and
 * never on a programmatic write: a prefill outside `isTypeableMoneyText` leaves
 * a field that cannot even be backspaced, because every intermediate prefix is
 * refused with nothing on screen to say why. **That is enforced on the way out
 * rather than assumed** — the last line is the property, so it holds for every
 * `number | null | undefined` a caller can pass and not only for the values
 * today's four columns happen to admit.
 *
 * A stored negative is what makes that difference load-bearing.
 * `budgets.limit_amount` is a bare `REAL NOT NULL` with **no CHECK at all**
 * (`migrations/013:8`), so `-5` reaches here, `String()` renders it `'-5'`, and
 * the mask refuses `'-5'`, refuses the `'-'` a backspace leaves behind, and
 * refuses every digit appended to either — a field editable only by
 * select-all-and-retype. Rendering it as `''` instead opens the field blank
 * against a validator that requires a value, which is loud and repairable. It
 * is never re-signed into `'5'`: that would manufacture a number nobody stored,
 * one that clears the floor and is one Save from being written — the exact
 * substitution @layla Q7 forbids.
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
 * and their sheets prefill only in edit mode, so neither takes it. The
 * postcondition returns `''` too, meaning something else — not "unallocated"
 * but "unrenderable". One return value covers both because the field does the
 * same thing with either: it opens blank and the user owns what goes in it.
 */
export function formatStoredMoneyText(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = expandExponentialNotation(String(value));
  return isTypeableMoneyText(text) ? text : '';
}

/**
 * The index at which one character was inserted into `previous` to produce
 * `next`, or `undefined` if `next` is not a single-character insertion at all.
 *
 * `i` is the length of the common prefix; the insertion holds iff `next` is one
 * character longer and the remainder after `next[i]` is the remainder of
 * `previous` from `i`. That covers append-at-end and cursor-mid-string
 * identically, which is the point: `'150' → '1,50'` (caret after the `1`) is
 * `i = 1` with an inserted `,`, and a mask that only compared suffixes would
 * read it as a paste.
 *
 * Repeated characters make `i` ambiguous as an *index* (`'11' → '111'` could be
 * any of three) and never as a *character*, so the leftmost `i` is safe — the
 * caller consumes `next[i]` and rewrites at `i`, and every candidate index
 * yields the same string either way.
 */
function singleCharacterInsertionIndex(previous: string, next: string): number | undefined {
  if (next.length !== previous.length + 1) return undefined;
  let index = 0;
  while (index < previous.length && previous[index] === next[index]) index += 1;
  return next.slice(index + 1) === previous.slice(index) ? index : undefined;
}

/**
 * The keystroke mask for a money field. `previous` is the text the field holds
 * in JS right now — the Controller's value, or the store's entry for that
 * allocation row; `next` is what `onChangeText` delivered.
 *
 * Returns the text to accept, which is **not necessarily `next`**, or
 * `undefined` for **refused — write nothing, leave the field on `previous`**.
 * `''` is a legal accepted value, which is why the refusal channel is
 * `undefined` rather than a falsy string; it is the same `T | undefined` shape
 * `parse_decimal.ts` already uses for "no value". A `{ accepted, reason }`
 * union was considered and cut: no call site reads a reason.
 *
 * **The classification is a diff, never an inspection of `next` alone.**
 * `'1,500'` pasted and a comma typed into the middle of `'150'` are the same
 * string to a whole-string predicate and opposite verdicts here — that is the
 * whole correction MA-020's Q10 makes to the mask it reverted.
 *
 * | # | `previous` → `next` | action |
 * |---|---|---|
 * | 1 | `next === previous` | accept — a no-op delivery |
 * | 2 | one char inserted, a digit | step C on `next` |
 * | 3 | one char inserted, `,` | rewrite that character to `.`, step C on the candidate |
 * | 4 | one char inserted, `.` | step C on `next` |
 * | 5 | one char inserted, anything else | refuse |
 * | 6 | not a single insertion, `next` contains `,` | **refuse, unconditionally** |
 * | 7 | not a single insertion, no `,` | step C on `next` |
 *
 * Step C is `isTypeableMoneyText`. Rows 2, 4 and 5 are one branch below rather
 * than three: a character the pattern does not admit cannot survive step C, and
 * `next` still contains it, so row 5 is closed by the same call rows 2 and 4
 * pass through. `'1' → '1a'` is refused there, and it is pinned as its own row.
 *
 * **Row 6 is the 1000× guard and it is decided by shape, before any
 * interpretation.** A comma in a multi-character delta is refused whatever it
 * would parse to: `'1,500'` read as grouping is `1500` and read as a decimal is
 * `1.5`, and both are guesses. The refusal is unconditional, so `'1,234.56'` is
 * refused too even though it is unambiguously en-US grouping — narrowing it is
 * a review finding, not an improvement (@sarah, MA-020 Q10 ruling 2).
 *
 * **Row 7 is not a hole.** It is deletion, select-all-and-retype, an IME
 * committing several characters at once, and a comma-free paste — all of which
 * route to `isTypeableMoneyText`, which is what the reverted mask did to every
 * delivery.
 *
 * **The invariant, which is what keeps `parse_decimal.ts` byte-identical safe:
 * accepted text never contains a comma.** Row 3 rewrites the only comma a
 * single insertion can introduce, rows 6 and 7 refuse or accept only
 * comma-free strings, row 1 is a no-op on already-accepted text, and the
 * programmatic prefill comes from `formatStoredMoneyText`, which is `String(n)`
 * surgery and carries no grouping. So `previous` is always comma-free — which
 * is also why the diff can never mistake a comma already in `previous` for a
 * newly typed one — and no comma-bearing string reaches `DECIMAL_PATTERN` from
 * these fields on any path.
 *
 * It never truncates: `'0.005'` is accepted and fails the floor check further
 * down, where the message is legible. And it admits `'1.'`, `'.'` and `'.5'`,
 * which `DECIMAL_PATTERN` rejects, so the schema's pattern refine stays
 * reachable rather than becoming dead code behind the mask.
 */
export function maskMoneyFieldText(previous: string, next: string): string | undefined {
  if (next === previous) return next;

  const index = singleCharacterInsertionIndex(previous, next);
  if (index === undefined) {
    if (next.includes(',')) return undefined;
    return isTypeableMoneyText(next) ? next : undefined;
  }

  const candidate = next[index] === ',' ? `${next.slice(0, index)}.${next.slice(index + 1)}` : next;
  return isTypeableMoneyText(candidate) ? candidate : undefined;
}

/**
 * The keystroke rule for a form field that may or may not hold money. A name
 * field is never masked, whatever the text and whatever the delta shape; an
 * amount field gets exactly `maskMoneyFieldText`'s verdict, with no truncation
 * and no second normalisation layered on top.
 *
 * It takes the field's own `variant` rather than a boolean the caller derives,
 * because the trap it closes is a shared component: `SpendingPlanField` renders
 * both the plan name and the plan total through one `onChangeText`, so a mask
 * applied there unconditionally would refuse every letter of a plan name with
 * nothing on screen to say why. A call site that passes its `variant` straight
 * through cannot get that wrong; a call site that computed a boolean could, and
 * no test of this function would see it — which is why spec §6 check 2 greps
 * for `maskFieldText(props.variant, ` and not merely for the absence of a
 * literal.
 *
 * `setAllocationText` deliberately keeps calling `maskMoneyFieldText`
 * directly — it has no variant, and inventing one for it would be an
 * abstraction with a single fake caller.
 */
export function maskFieldText(
  variant: 'name' | 'amount',
  previous: string,
  next: string,
): string | undefined {
  return variant === 'name' ? next : maskMoneyFieldText(previous, next);
}
