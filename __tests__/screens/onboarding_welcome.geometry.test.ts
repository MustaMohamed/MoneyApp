import { resolveDisplayHeadlineA11y } from '@/components/ui/display_headline.geometry';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, TouchSize } from '@/constants/theme';
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
    expect(Object.keys(CURRENCY_ROW_STYLE)).not.toContain('borderColor');
    expect(Object.keys(CURRENCY_ROW_STYLE)).not.toContain('backgroundColor');
    // `Size.hairline`, not a literal 1: `minHeight` is derived from the same token.
    expect(CURRENCY_ROW_STYLE.borderWidth).toBe(Size.hairline);
    expect(CURRENCY_ROW_STYLE.minHeight).toBe(CURRENCY_ROW_MIN_HEIGHT);
  });

  it('is frozen, so the no-colour guarantee outlives module load', () => {
    expect(Object.isFrozen(CURRENCY_ROW_STYLE)).toBe(true);
  });
});

describe('N1 headline announcement — Done-when, pinned here because the AVD has no TalkBack', () => {
  it('announces "Finally clear." once, as a heading', () => {
    const a11y = resolveDisplayHeadlineA11y(Strings.n1HeadlineLine2);
    expect(Strings.n1HeadlineLine2).toBe('Finally clear.');
    expect(a11y.container.accessibilityRole).toBe('header');
    expect(a11y.container.accessibilityLabel).toBe('Finally clear.');
    expect(a11y.graphic.importantForAccessibility).toBe('no-hide-descendants');
  });
});
