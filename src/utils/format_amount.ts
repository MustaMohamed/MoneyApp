import { CURRENCY_CONFIG } from '@/constants/currency';
import { type Currency } from '@/constants/enums';

// A NONZERO negative magnitude that rounds to zero at this precision still carries the
// minus sign, and reads as a small debt that does not exist. Struck after formatting,
// never before: the input is not -0 (Object.is(-0.4, -0) is false), so a numeric
// pre-normalise cannot see it.
//
// The `value !== 0` clause is load-bearing and is NOT a redundant fast path. An exact -0
// arriving here is a DOMAIN defect — `normalizeNegativeZero` failed to run as the last
// operation before the formatter — and this layer deliberately leaves it on screen rather
// than laundering it. Widening the condition to catch everything deletes the three
// tripwire tests' only signal. See docs/adr/2026-08-21-currency-aware-display-decimals.md §2.
//
// Looks like ZERO_AT_DISPLAY_PRECISION below (one character apart) but is not the same
// check: this one matches an Intl-produced sign character, the other matches a bare
// magnitude that was Math.abs()'d before this regex ever sees it. Do not fold them into
// one — they run at different layers, over different populations (§2 vs §2.1).
const SIGNED_ZERO = /^-0(\.0+)?$/;

// Rate precision, shared by every rate site that keeps its own surrounding string. Not the
// same constant as exchange_rate_row.tsx's RATE_PREVIEW_AMOUNT_DECIMALS — that one is a
// pre-confirmation EGP amount, not a rate, and the two are allowed to diverge; see the ADR.
export const EXCHANGE_RATE_DECIMALS = 2;

// One formatter per fraction-digit count, keyed on `decimals`. Total because the locale is
// the string literal 'en-US' in the constructor call below — not a runtime input — so
// `decimals` is the only thing that varies across constructions. If a locale ever becomes a
// parameter, this key must grow with it or the cache stops being total.
// Observed keys resolve to {0, 1, 2}.
//
// The `new Intl.NumberFormat('en-US', {` call below must stay on one physical line:
// scripts/validate-money-formatting.js matches the constructor line by line (`:78`), so
// splitting it across lines reds `npm run lint` on the sanctioned allowlist entry even
// though the constructor is still there. Since MA-017 it also reds `npm test` —
// __tests__/scripts/validate_money_formatting.test.ts runs the validator against the real
// tree and asserts exit 0.
const FORMATTERS = new Map<number, Intl.NumberFormat>();

function formatterFor(decimals: number): Intl.NumberFormat {
  const cached = FORMATTERS.get(decimals);
  if (cached !== undefined) return cached;
  const created = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  FORMATTERS.set(decimals, created);
  return created;
}

export function formatAmount(value: number, decimals = 0): string {
  const formatted = formatterFor(decimals).format(value);
  return value !== 0 && SIGNED_ZERO.test(formatted) ? formatted.slice(1) : formatted;
}

export function formatCurrencyAmount(value: number, currency: Currency, decimals?: number): string {
  const config = CURRENCY_CONFIG[currency];
  return `${formatAmount(value, decimals ?? config.decimals)} ${config.code}`;
}

export function formatWithCurrencyCode(value: number, code: string, decimals = 0): string {
  return `${formatAmount(value, decimals)} ${code}`;
}

// Mirrors roundMoney's fixed precision (src/utils/money.ts) — the domain's persisted
// precision, not any currency's display precision. Not exported from money.ts because
// nothing there needs it as a value; it exists here only as the fallback this function
// escalates to.
const MONEY_ROUNDING_DECIMALS = 2;

// Matches a magnitude that prints as a literal zero at the site's display precision —
// "0", "0.0", "0.00" — even though the rounded value it came from is nonzero. No sign
// variant needed: the input here is always Math.abs()'d before this runs.
//
// Looks like SIGNED_ZERO above (one character apart) but is not the same check — see
// that comment for the distinction. Do not fold them into one.
const ZERO_AT_DISPLAY_PRECISION = /^0(\.0+)?$/;

// Chosen independently of roundMoney's 1e-9 (src/utils/money.ts:18) — the two share a
// numeral but not a derivation, and do not track each other. roundMoney's 1e-9 bounds a
// DISTANCE from a half-cent boundary, in ×100-scaled units (compared against
// `Math.abs(remainder - 0.5)`, remainder being the fractional part of `abs(n) * 100` — i.e.
// 1e-11 in currency units). This one bounds an absolute MAGNITUDE, unscaled (compared
// against `Math.abs(value)` directly). Different operand, different scale, different
// question; do not "fix" one by copying the other's value.
//
// What this epsilon actually does: tells a true zero apart from a nonzero value that is
// merely small. `net === 0` after a JS `income - expense` subtraction can arrive as
// `-1e-13` (float noise on a genuine tie) — smaller than this epsilon, correctly a true
// zero. `tx.amount` can arrive as `0.001` — a raw, unrounded persisted value (see the
// isTrueZero test below) — larger than this epsilon, correctly NOT a true zero, even
// though it is far smaller than either currency's display precision.
//
// Trade recorded, not derived: the prior rule zeroed anything under half a cent (0.005);
// this one zeroes only under 1e-9, so the float-noise headroom for an income-expense tie
// drops from 0.005 to 1e-9. Measured residue per accumulation is ~2.2e-16 × magnitude, so
// it stays under 1e-9 until EGP totals reach roughly 5e6 over several additions — four-plus
// orders of headroom at realistic balances. Not a defect; a narrower margin than before.
const ZERO_EPSILON = 1e-9;

/**
 * The magnitude four composed-sign call sites were each computing by hand
 * (`transactions.helpers.ts`, `detail.helpers.ts`, `transaction_row.helpers.ts`,
 * `transfer_flow_card.tsx`), plus whether the value is a true zero — and, since MA-016's
 * second amendment round, the same magnitude problem `formatCommitmentAmount`
 * (`src/modules/commitments/screens/commitments/commitment_status.ts`) has independently
 * of any sign. Callers own sign composition (where they have one) and any currency-code
 * suffix — this owns exactly the money-precision problem: `roundMoney` persists at 2dp,
 * but EGP's 0dp display precision can round a genuine 0.40 down to a printed "0", and a
 * sign glyph beside that (where present) reads as a direction that does not exist. See
 * docs/adr/2026-08-21-currency-aware-display-decimals.md §2.1.
 *
 * The rule, site-independent:
 *   1. `isTrueZero = Math.abs(value) < ZERO_EPSILON`, tested on the RAW value, never on
 *      `roundMoney(value)`. Those coincide only when the input is already known to live at
 *      2dp precision — true for `net`, `egp_amount`, `to_amount`, NOT true for a raw
 *      `tx.amount`, which `transaction.repository.ts:309` persists at whatever precision the
 *      input parses to — not guaranteed already at 2dp — and which `parsePositiveDecimal`
 *      accepts at any positive precision. Rounding first would let a real `0.001` collapse to
 *      a false true-zero and print with no sign at all.
 *   2. `isTrueZero` -> magnitude `"0"`, `isZero: true`. There is no direction to report.
 *   3. otherwise -> render `Math.abs(value)` at the site's normal (currency-config)
 *      precision. If that would print a literal zero, escalate ONCE, to
 *      `MONEY_ROUNDING_DECIMALS`' 2dp ceiling — never further, so this stays the display
 *      layer's cap on precision rather than a window onto whatever precision the raw value
 *      happens to carry (M1/M22, the uncapped-`Intl` defect this cleanup exists to close).
 *      The escalation takes `roundMoney`'s PRECISION only, never its MODE: banker's
 *      (half-even) rounding exists to keep aggregations of PERSISTED values unbiased, a
 *      property no display string has, so this branch renders at half-expand — the same mode
 *      every other call to `formatAmount` already uses. For a currency whose display
 *      precision already matches or exceeds `MONEY_ROUNDING_DECIMALS` — USD today — the
 *      branch is still entered (a sub-cent magnitude like `0.001` prints "0.00" at 2dp and
 *      trips the escalate check), it is just a no-op there: re-rendering at 2dp produces the
 *      same string `atSitePrecision` already held. Not unreachable — reached and idempotent.
 *      See `__tests__/format_amount.test.ts`'s USD rows.
 */
export function formatDisplayMagnitude(
  value: number,
  currency: Currency,
): { text: string; isZero: boolean } {
  const isTrueZero = Math.abs(value) < ZERO_EPSILON;
  if (isTrueZero) return { text: formatAmount(0, 0), isZero: true };

  const magnitude = Math.abs(value);
  const config = CURRENCY_CONFIG[currency];
  const atSitePrecision = formatAmount(magnitude, config.decimals);
  const text = ZERO_AT_DISPLAY_PRECISION.test(atSitePrecision)
    ? formatAmount(magnitude, MONEY_ROUNDING_DECIMALS)
    : atSitePrecision;
  return { text, isZero: false };
}

/**
 * `48.60 EGP/USD` — the rate pill's label (mockup.html:2385 draws the longer
 * `1 USD = 48.60 EGP`; spec §1.4 shortens it). The long form needs 137.4pt of
 * N4's 330pt pill track, which is what pushed the three-pill F2 row to 329.1pt;
 * the compact form buys back ~40pt and lands the row at ~289pt, so all three
 * pills fit on one line at base text size — which is what lets
 * `Size.summaryPillTrack` be a ONE-line track with no dead space in the six
 * states that carry two pills.
 *
 * The unit order stays rate-first because that is how the pill reads next to a
 * swap glyph. Rounding is unchanged: two decimals, from `formatAmount`.
 */
export function formatExchangeRate(rate: number): string {
  return `${formatAmount(rate, EXCHANGE_RATE_DECIMALS)} EGP/USD`;
}
