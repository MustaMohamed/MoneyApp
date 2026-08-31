import { availableCreditColor } from '@/modules/accounts/constants/available_credit_color';

describe('availableCreditColor — thresholds shared by dashboard and detail', () => {
  it('returns text2 grey when limit <= 0', () => {
    expect(availableCreditColor(0, 0)).toBe('#6B7F99');
  });
  it('positive when > 50% available', () => {
    expect(availableCreditColor(600, 1000)).toBe('#4CAF82');
  });
  it('warning when 20%–50% available', () => {
    expect(availableCreditColor(300, 1000)).toBe('#E8B130');
  });
  it('negative when < 20% available', () => {
    expect(availableCreditColor(100, 1000)).toBe('#E05A42');
  });
});
