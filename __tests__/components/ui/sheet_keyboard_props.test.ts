import { resolveKeyboardProps } from '@/components/ui/sheet';

describe('resolveKeyboardProps', () => {
  it('defaults to adjustResize, the window mode the app manifest declares', () => {
    expect(resolveKeyboardProps(false).android_keyboardInputMode).toBe('adjustResize');
  });

  it('opting in resolves adjustPan, so gorhom compensates for the keyboard itself', () => {
    expect(resolveKeyboardProps(true).android_keyboardInputMode).toBe('adjustPan');
  });

  it('keeps interactive behaviour and restore-on-blur in both modes', () => {
    for (const liftsAboveKeyboard of [false, true]) {
      expect(resolveKeyboardProps(liftsAboveKeyboard)).toMatchObject({
        keyboardBehavior: 'interactive',
        keyboardBlurBehavior: 'restore',
      });
    }
  });
});
