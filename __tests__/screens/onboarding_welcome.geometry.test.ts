import { resolveDisplayHeadlineA11y } from '@/components/ui/display_headline.geometry';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { TouchSize } from '@/constants/theme';
import {
  CURRENCY_OPTIONS,
  CURRENCY_ROW_MIN_HEIGHT,
  CURRENCY_ROW_STYLE,
  resolveCurrencyOptionA11y,
} from '@/modules/onboarding/screens/onboarding/welcome/welcome.geometry';

describe('N1 currency options', () => {
  it('offers exactly two, EGP first — business rule 5', () => {
    expect(CURRENCY_OPTIONS.map((o) => o.value)).toEqual([Currency.EGP, Currency.USD]);
  });

  it('states each choice its own display consequence — scope.md decision 1', () => {
    expect(CURRENCY_OPTIONS[0].consequence).toBe(Strings.n1CurrencyEgpConsequence);
    expect(CURRENCY_OPTIONS[1].consequence).toBe(Strings.n1CurrencyUsdConsequence);
  });

  it('announces the label and its consequence as one name', () => {
    expect(resolveCurrencyOptionA11y(CURRENCY_OPTIONS[1]).accessibilityLabel).toBe(
      `${Strings.n1CurrencyUsdLabel}. ${Strings.n1CurrencyUsdConsequence}`,
    );
  });
});

describe('N1 currency row — the zero-shift contract', () => {
  it('clears the touch floor', () => {
    expect(CURRENCY_ROW_MIN_HEIGHT).toBeGreaterThanOrEqual(TouchSize.min);
  });

  it('carries no colour, so selection cannot change geometry', () => {
    // The shared style object is the whole geometry of the row. Every colour a
    // selected row takes on lives in the isSelected branch, never here — if a
    // colour key appears, a future edit can change borderWidth beside it.
    expect(Object.keys(CURRENCY_ROW_STYLE)).not.toContain('borderColor');
    expect(Object.keys(CURRENCY_ROW_STYLE)).not.toContain('backgroundColor');
    expect(CURRENCY_ROW_STYLE.borderWidth).toBe(1);
    expect(CURRENCY_ROW_STYLE.minHeight).toBe(CURRENCY_ROW_MIN_HEIGHT);
  });
});

// Plan review: the role/label/hidden-graphic half of this block already exists
// at __tests__/components/ui/display_headline_geometry.test.ts:39-53 (MA-002).
// What is genuinely new here is the *binding* — that the string N1 hands the
// headline is the one the mockup draws. Keep it (the Done-when clause names it),
// but do not read it as new coverage of the role: neither assertion proves the
// screen wires the resolver, which is why gate 3 on hardware stays the real
// confirmation.
describe('N1 headline announcement — Done-when, pinned here because the AVD has no TalkBack', () => {
  it('announces "Finally clear." once, as a heading', () => {
    const a11y = resolveDisplayHeadlineA11y(Strings.n1HeadlineLine2);
    expect(Strings.n1HeadlineLine2).toBe('Finally clear.');
    expect(a11y.container.accessibilityRole).toBe('header');
    expect(a11y.container.accessibilityLabel).toBe('Finally clear.');
    expect(a11y.graphic.importantForAccessibility).toBe('no-hide-descendants');
  });
});
