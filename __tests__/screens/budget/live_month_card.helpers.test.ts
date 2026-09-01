import { Colors } from '@/constants/theme';
import { resolveLiveMonthLeftPresentation } from '@/modules/budget/screens/budget/category_detail/components/live_month_card.helpers';

// Converges live_month_card.tsx's "left" figure to month_ledger.tsx / monthly_result_chart.tsx's
// sign-conditional colour (#334 marcus ruling) and routes the amount through the sign-safe
// composition, so an overspent month no longer shows a static green "-200 left".
describe('resolveLiveMonthLeftPresentation — the left-to-spend composition point (#334)', () => {
  it.each([
    [1000, 400, '600', Colors.dark.positive],
    [1000, 1000, '0', Colors.dark.positive],
    [1000, 1200, '−200', Colors.dark.negative],
    [1000, 1000.4, '−0.40', Colors.dark.negative],
  ] as const)('limit %s, spent %s -> %s at %s', (limit, spent, expectedText, expectedColor) => {
    const { text, color } = resolveLiveMonthLeftPresentation(limit, spent);
    expect(text).toBe(expectedText);
    expect(color).toBe(expectedColor);
  });

  it('composes U+2212, never an ASCII hyphen, when over budget', () => {
    const { text } = resolveLiveMonthLeftPresentation(1000, 1200);
    expect(text.codePointAt(0)).toBe(0x2212);
    expect(text).not.toContain('-');
  });

  it('never prefixes `+` when still under budget', () => {
    expect(resolveLiveMonthLeftPresentation(1000, 400).text).not.toContain('+');
  });
});
