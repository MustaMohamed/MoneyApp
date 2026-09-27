import { Spacing, TouchSize } from '@/constants/theme';
import {
  ACCOUNT_STRIP_CHIP_MIN_HEIGHT,
  ACCOUNT_STRIP_CHIP_WIDTH,
  ACCOUNT_STRIP_GAP,
} from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_geometry';
import { ms } from '@/utils/responsive';

describe('account strip geometry', () => {
  it('draws each chip 64 wide with an 8 gap', () => {
    expect(ACCOUNT_STRIP_CHIP_WIDTH).toBe(ms(64));
    expect(ACCOUNT_STRIP_GAP).toBe(Spacing.xs);
  });

  it('fits five chips inside a 390 screen less the strip margins', () => {
    expect(5 * ACCOUNT_STRIP_CHIP_WIDTH + 4 * ACCOUNT_STRIP_GAP).toBeLessThanOrEqual(
      ms(390) - 2 * Spacing.md,
    );
  });

  it('keeps every chip a 44 hit target in both directions', () => {
    expect(ACCOUNT_STRIP_CHIP_MIN_HEIGHT).toBeGreaterThanOrEqual(TouchSize.min);
    expect(ACCOUNT_STRIP_CHIP_WIDTH).toBeGreaterThanOrEqual(TouchSize.min);
  });
});
