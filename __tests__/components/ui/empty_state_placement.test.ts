import {
  EMPTY_STATE_VARIANT_CONFIG,
  resolveEmptyStatePlacement,
} from '@/components/ui/empty_state';

describe('resolveEmptyStatePlacement', () => {
  it.each([
    [undefined, 'centered', 'centered'],
    ['inline', 'centered', 'inline'],
    ['inline', 'inline', 'inline'],
    [undefined, 'inline', 'inline'],
  ] as const)('(%s, %s) resolves to %s', (override, variantPlacement, expected) => {
    expect(resolveEmptyStatePlacement(override, variantPlacement)).toBe(expected);
  });
});

describe('shipped empty-state placements', () => {
  it('keeps filtered centred and the archived-only block inline', () => {
    expect(EMPTY_STATE_VARIANT_CONFIG.filtered.placement).toBe('centered');
    expect(EMPTY_STATE_VARIANT_CONFIG.accountsArchivedOnly.placement).toBe('inline');
  });
});
