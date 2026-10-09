import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';
import { availableCreditColor } from '@/modules/accounts/constants/available_credit_color';

// The first argument is the card's balance; the band reads how much of the limit is used.
describe('availableCreditColor — thresholds shared by dashboard and detail', () => {
  it('keeps the neutral colour when the card has no limit', () => {
    expect(availableCreditColor(500, 0)).toBe(CoreTokens.text2);
  });
  it('positive when more than 50% is available', () => {
    expect(availableCreditColor(400, 1000)).toBe(SemanticTokens.positive);
  });
  it('warning when 20% to 50% is available', () => {
    expect(availableCreditColor(700, 1000)).toBe(SemanticTokens.warning);
  });
  it('negative when less than 20% is available', () => {
    expect(availableCreditColor(900, 1000)).toBe(SemanticTokens.negative);
  });
  it('warning at exactly 50% available and at exactly 20% available', () => {
    expect(availableCreditColor(500, 1000)).toBe(SemanticTokens.warning);
    expect(availableCreditColor(800, 1000)).toBe(SemanticTokens.warning);
  });
});
