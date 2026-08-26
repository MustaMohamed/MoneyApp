import { lineHeightFor } from '@/constants/theme';

describe('lineHeightFor', () => {
  it('rounds fontSize * 1.3', () => {
    expect(lineHeightFor(10)).toBe(13); // 13.0 -> 13
    expect(lineHeightFor(12)).toBe(16); // 15.6 -> 16
    expect(lineHeightFor(20)).toBe(26); // 26.0 -> 26
  });

  it('rounds half-up, matching Math.round', () => {
    // 11.5 * 1.3 = 14.95 -> 15
    expect(lineHeightFor(11.5)).toBe(15);
  });
});

/**
 * A `readFileSync`-over-source guard on the `fontSize`/`lineHeight` pairing
 * used to live here. It was removed at implementation review round 3, D1.
 *
 * It was the shape `.claude/rules/tests.md` prunes as audit M35, and the
 * shape MA-009's own plan decision 6 had already refused for this same file
 * set. It also did not work: its regex matched only inline `style={{ ... }}`,
 * so it inspected 2 of `account_type_tile.tsx`'s 6 style props and 1 of
 * `field_message_rail.tsx`'s 2 — adding an unpaired `fontSize` to a
 * module-level style constant, or writing `style={[{ fontSize: X }, y]}`,
 * left it green. Both mutations were run against the shipped regex.
 *
 * The invariant is still worth enforcing; the right tool is an oxlint rule,
 * which sees module-level and array styles and files nobody remembered to
 * add to a list. Not written here: a lint rule is not this task's scope.
 *
 * That rule shipped in W1D c2 (#230): `moneyapp/font-size-pairs-line-height`
 * (scripts/oxlint-plugin-moneyapp.js), detected at warn by `npm run lint` — not
 * yet enforced; a warning doesn't fail CI. Blocking arrives with the burn-down
 * issue's flip to error. It sees module-level style constants, array-style
 * members, and any file nobody remembered to add to a list — the three ways
 * the regex above failed.
 */
