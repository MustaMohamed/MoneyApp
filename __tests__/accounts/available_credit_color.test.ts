import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';
import { creditBandColor } from '@/modules/accounts/constants/available_credit_color';

// The first argument is the card's balance; the band reads how much of the limit is used.
describe('creditBandColor — thresholds shared by dashboard and detail', () => {
  it('keeps the neutral colour when the card has no limit, and negative for a limit under half a cent', () => {
    expect(creditBandColor(500, 0)).toBe(CoreTokens.text2);
    expect(creditBandColor(500, 0.004)).toBe(SemanticTokens.negative);
  });
  // 820.08 / 1025.1 is 0.8000000000000002 and 799.86 + 0.07 + 0.07 is 800.0000000000001.
  it('warning at exactly 80% used to the cent, negative one cent past it', () => {
    expect({
      oneCentPast: creditBandColor(820.09, 1025.1),
      onBoundary: creditBandColor(820.08, 1025.1),
      floatSum: creditBandColor(799.86 + 0.07 + 0.07, 1000),
    }).toEqual({
      oneCentPast: SemanticTokens.negative,
      onBoundary: SemanticTokens.warning,
      floatSum: SemanticTokens.warning,
    });
  });
  // 499.96 + 0.01 + 0.03 is 499.99999999999994, which is 500.00 to the cent.
  it('warning at exactly 50% used to the cent, positive one cent below it', () => {
    expect({
      oneCentBelow: creditBandColor(512.54, 1025.1),
      onBoundary: creditBandColor(512.55, 1025.1),
      floatSum: creditBandColor(499.96 + 0.01 + 0.03, 1000),
    }).toEqual({
      oneCentBelow: SemanticTokens.positive,
      onBoundary: SemanticTokens.warning,
      floatSum: SemanticTokens.warning,
    });
  });
  it('positive when more than 50% is available', () => {
    expect(creditBandColor(400, 1000)).toBe(SemanticTokens.positive);
  });
  it('warning when 20% to 50% is available', () => {
    expect(creditBandColor(700, 1000)).toBe(SemanticTokens.warning);
  });
  it('negative when less than 20% is available', () => {
    expect(creditBandColor(900, 1000)).toBe(SemanticTokens.negative);
  });
  it('warning at exactly 50% available and at exactly 20% available', () => {
    expect(creditBandColor(500, 1000)).toBe(SemanticTokens.warning);
    expect(creditBandColor(800, 1000)).toBe(SemanticTokens.warning);
  });
});
