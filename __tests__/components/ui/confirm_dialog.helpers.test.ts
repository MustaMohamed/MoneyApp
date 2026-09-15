import { shouldDismissOnOpenChange } from '@/components/ui/confirm_dialog.helpers';

// The overlay press and HeroUI's hardware-back listener both reach the dialog as `onOpenChange(false)`.
describe('shouldDismissOnOpenChange', () => {
  it.each([
    ['a close while busy, as hardware back during a delete', false, true, false],
    ['a close while idle', false, false, true],
    ['an open while idle', true, false, false],
    ['an open while busy', true, true, false],
  ])('%s', (_label, open, busy, expected) => {
    expect(shouldDismissOnOpenChange(open, busy)).toBe(expected);
  });
});
