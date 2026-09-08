import { resolveEmptyStatePlacement } from '@/components/ui/empty_state';

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
