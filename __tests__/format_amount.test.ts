import { Currency } from '@/constants/enums';
import {
  formatAmount,
  formatCurrencyAmount,
  formatCurrencyParts,
  formatDisplayMagnitude,
  formatExchangeRate,
} from '@/utils/format_amount';

describe('formatAmount', () => {
  it('formats integer with comma separator', () => {
    expect(formatAmount(10500)).toBe('10,500');
  });

  it('formats large number with multiple commas', () => {
    expect(formatAmount(1234567)).toBe('1,234,567');
  });

  it('returns "0" for zero', () => {
    expect(formatAmount(0)).toBe('0');
  });

  it('formats negative amounts', () => {
    expect(formatAmount(-5000)).toBe('-5,000');
  });

  it('formats with 2 decimal places when specified', () => {
    expect(formatAmount(10500.5, 2)).toBe('10,500.50');
  });

  it('formats with 1 decimal place', () => {
    expect(formatAmount(10500.5, 1)).toBe('10,500.5');
  });

  it('always shows exact decimal count (no rounding display)', () => {
    expect(formatAmount(5000, 2)).toBe('5,000.00');
  });
});

describe('currency amount formatting', () => {
  it('uses the configured currency decimals by default', () => {
    expect(formatCurrencyAmount(10500.5, Currency.USD)).toBe('10,500.50 USD');
  });

  it('honors an explicit currency decimal count', () => {
    expect(formatCurrencyAmount(10500.5, Currency.EGP, 1)).toBe('10,500.5 EGP');
  });

  it('formats the USD to EGP exchange-rate label in the compact pill form', () => {
    // spec §1.4: the label shortened from `1 USD = 48.13 EGP` so three pills
    // fit one line on N4. The 48.125 -> 48.13 rounding is unchanged; only the
    // surrounding text moved.
    expect(formatExchangeRate(48.125)).toBe('48.13 EGP/USD');
  });

  it('#243: formatCurrencyParts splits value and code, decimals from CURRENCY_CONFIG by default', () => {
    expect(formatCurrencyParts(10500.5, Currency.USD)).toEqual({
      value: '10,500.50',
      code: 'USD',
    });
    expect(formatCurrencyParts(10500.5, Currency.EGP)).toEqual({ value: '10,501', code: 'EGP' });
  });

  it('#243: formatCurrencyParts honors an explicit decimal count, both sides of the ?? covered', () => {
    expect(formatCurrencyParts(10500.5, Currency.EGP, 1)).toEqual({
      value: '10,500.5',
      code: 'EGP',
    });
  });

  it('#243: formatCurrencyAmount is the join of formatCurrencyParts, pinned against pre-refactor literals', () => {
    // NOT `formatCurrencyAmount(x, c) === \`${parts.value} ${parts.code}\`` — after this
    // refactor formatCurrencyAmount IS that join, so the property is a tautology that holds
    // for a broken formatCurrencyParts too. These three strings were captured before the
    // refactor and pinned as literals instead — they fail if the parts are wrong, if the
    // separator is wrong, or if the code node is wrong.
    expect(formatCurrencyAmount(10500.5, Currency.USD)).toBe('10,500.50 USD');
    expect(formatCurrencyAmount(10500.5, Currency.EGP)).toBe('10,501 EGP');
    expect(formatCurrencyAmount(10500.5, Currency.EGP, 1)).toBe('10,500.5 EGP');
  });
});

describe('formatAmount — the signed-zero display guard', () => {
  // The guard's whole contract in two adjacent inputs, opposite outcomes, one line of
  // code between them. This is what stops a future reader "simplifying" the condition
  // to catch everything — see docs/adr/2026-08-21-currency-aware-display-decimals.md §2.
  it('draws the line between the domain population and the display population', () => {
    expect(formatAmount(-0)).toBe('-0'); // exact -0 is the domain's bug, not this layer's
    expect(formatAmount(-0.4)).toBe('0'); // nonzero, rounds to zero at 0dp — this layer's job
  });

  it('strips the sign from a nonzero negative that rounds to zero at display precision', () => {
    expect(formatAmount(-0.4, 0)).toBe('0');
    expect(formatAmount(-0.001, 0)).toBe('0');
    expect(formatAmount(-0.004, 2)).toBe('0.00');
    expect(formatAmount(-0.001, 2)).toBe('0.00');
    expect(formatAmount(-1e-7, 3)).toBe('0.000');
  });

  it('leaves an exact -0 visible — it is a domain defect, not this layer to repair', () => {
    expect(formatAmount(-0, 0)).toBe('-0');
    expect(formatAmount(-0, 2)).toBe('-0.00');
  });

  it('leaves a genuinely negative value, whose magnitude rounds to non-zero, byte-identical', () => {
    expect(formatAmount(-0.4, 2)).toBe('-0.40');
    expect(formatAmount(-0.01, 2)).toBe('-0.01');
    expect(formatAmount(-0.005, 2)).toBe('-0.01');
    expect(formatAmount(-0.5, 0)).toBe('-1');
    expect(formatAmount(-0.9, 0)).toBe('-1');
    expect(formatAmount(-0.001, 3)).toBe('-0.001');
    expect(formatAmount(-1234.5, 2)).toBe('-1,234.50');
    expect(formatAmount(-1, 0)).toBe('-1');
  });
});

describe('formatDisplayMagnitude', () => {
  // MA-016 P8 F-1 (@layla's ruling): the defect the composed-sign sites shared
  // was never the sign — it's that 0dp rounding discards precision the domain already
  // computed, printing "0" where the truth is "0.40". This is the one shared rule.
  // See docs/adr/2026-08-21-currency-aware-display-decimals.md §2.1.
  //
  // MA-018 P8 F-2: `isTrueZero` (above, tested on the RAW value) and `isZero` (returned,
  // tested on the RENDERED text) are two different questions and can disagree — a magnitude
  // like `0.001` is not a true zero (there's a real amount) but its rendered text at the
  // escalation cap still prints "0.00", so `isZero` is true anyway. Don't collapse one into
  // the other: `isTrueZero` says whether there's a magnitude to report at all, `isZero` says
  // whether what's about to print can carry a sign.
  it('collapses an exact zero to a bare, unsigned magnitude', () => {
    expect(formatDisplayMagnitude(0, Currency.EGP)).toEqual({ text: '0', isZero: true });
  });

  // Regression guard, not a new case: this passed under the OLD rounding-based zero test
  // for a different reason (roundMoney(-1e-13) === 0). MA-016's second amendment round
  // moved the zero test onto the raw value with roundMoney's own 1e-9 epsilon, so this row
  // must be pinned explicitly now — a bare `raw === 0` would have missed it entirely, and
  // a wider epsilon could swallow USD 0.001 (also pinned below) into a false true-zero.
  it('collapses a float tie (-1e-13, income === expense) to a true, unsigned zero', () => {
    expect(formatDisplayMagnitude(-1e-13, Currency.EGP)).toEqual({ text: '0', isZero: true });
  });

  it('escalates to full rounding precision when EGP 0dp display would print a nonzero value as "0"', () => {
    expect(formatDisplayMagnitude(0.4, Currency.EGP)).toEqual({ text: '0.40', isZero: false });
    expect(formatDisplayMagnitude(-0.4, Currency.EGP)).toEqual({ text: '0.40', isZero: false });
  });

  it('does not escalate once 0dp already prints a nonzero digit', () => {
    expect(formatDisplayMagnitude(0.6, Currency.EGP)).toEqual({ text: '1', isZero: false });
  });

  // EGP's tie-breaking case for the same "does not escalate" rule: 249.50 rounds UP to an
  // already-nonzero "250" at 0dp, so there is nothing to escalate to. Also the ADR §1
  // worked-example row value (three of these total "749", accepted approximation).
  it('does not escalate a half-EGP tie that already rounds to a nonzero digit', () => {
    expect(formatDisplayMagnitude(249.5, Currency.EGP)).toEqual({ text: '250', isZero: false });
  });

  // MA-016 second amendment round (@layla): the zero test must run on the RAW value, not
  // on roundMoney(value) — a raw `tx.amount` is never guaranteed to already live at 2dp
  // (transaction.repository.ts:143 persists it unrounded), so 0.001 is a real nonzero
  // magnitude that must escalate to 2dp, not a false zero — `text` still reports the
  // escalated magnitude, `'0.00'`, not the raw `'0'` the true-zero branch would use.
  //
  // MA-018 P8 F-2 (@layla's ruling): `isZero` is now read off `text`, not fixed `false`
  // once past the true-zero branch — the RAW magnitude here is real and non-collapsed
  // (`isTrueZero` above is false, `text` is the escalated `'0.00'`, not `'0'`), but the
  // RENDERED text still prints as zero, so `isZero` reports `true`: there is nothing on
  // screen for a composed sign glyph to attach to. See the `isTrueZero`-vs-`isZero`
  // distinction noted beside the MA-016 comment above this describe block.
  it('escalates a sub-cent raw USD magnitude to 2dp, but reports isZero true — the escalation still cannot show a nonzero digit', () => {
    expect(formatDisplayMagnitude(0.001, Currency.USD)).toEqual({ text: '0.00', isZero: true });
    expect(formatDisplayMagnitude(0.004, Currency.USD)).toEqual({ text: '0.00', isZero: true });
  });

  it('does not escalate for USD magnitudes that already print a nonzero digit at 2dp', () => {
    expect(formatDisplayMagnitude(0.4, Currency.USD)).toEqual({ text: '0.40', isZero: false });
    expect(formatDisplayMagnitude(0.01, Currency.USD)).toEqual({ text: '0.01', isZero: false });
  });

  // #284 spec rows 1-4 (p1-gate-ruling.md §6, spec §3): the escalate branch dropped
  // roundMoney's banker's-rounding MODE while keeping its 2dp PRECISION as the ceiling.
  // Both branches now agree on half-expand — the same rounding Intl already applies on the
  // direct branch — so an EGP half-cent tie escalates the same way a USD one always has.
  it('escalates an EGP half-cent tie under half-expand, matching USD at the same magnitude (spec row 1)', () => {
    expect(formatDisplayMagnitude(0.005, Currency.EGP)).toEqual({ text: '0.01', isZero: false });
  });

  it('leaves the USD half-cent tie byte-identical — the direct branch was always half-expand (spec row 2)', () => {
    expect(formatDisplayMagnitude(0.005, Currency.USD)).toEqual({ text: '0.01', isZero: false });
  });

  it("escalates a second EGP half-cent tie under half-expand, not the old banker's rounding (spec row 3)", () => {
    expect(formatDisplayMagnitude(0.025, Currency.EGP)).toEqual({ text: '0.03', isZero: false });
  });

  it('holds the hard 2dp ceiling for a magnitude below half a cent, and reports isZero true since the ceiling prints no nonzero digit (spec row 4)', () => {
    expect(formatDisplayMagnitude(0.001, Currency.EGP)).toEqual({ text: '0.00', isZero: true });
  });

  // MA-018 P8 F-2 (@layla's ruling): pins the defect directly, not just the return
  // shape above — a magnitude below the escalation cap must report isZero: true on
  // BOTH currencies (EGP's own escalation and USD's already-at-cap "escalation"
  // alike), because a sign glyph beside a printed "0.00" reads as a direction that
  // does not exist regardless of which currency produced it.
  it('reports isZero true for a magnitude the 2dp escalation ceiling still cannot show a nonzero digit for, on both currencies', () => {
    expect(formatDisplayMagnitude(0.001, Currency.EGP).isZero).toBe(true);
    expect(formatDisplayMagnitude(0.001, Currency.USD).isZero).toBe(true);
  });

  // Sibling to the case above, same cap, opposite outcome: a magnitude the escalation
  // CAN show a nonzero digit for must still report isZero: false, so this fix cannot be
  // over-applied into suppressing a sign on a real, displayable small amount.
  it('reports isZero false for a magnitude the 2dp escalation can show a nonzero digit for', () => {
    expect(formatDisplayMagnitude(0.4, Currency.EGP)).toEqual({ text: '0.40', isZero: false });
  });
});
