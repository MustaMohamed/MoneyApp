import { resolveKeyboardProps, shouldBlurInputOnClose } from '@/components/ui/sheet';

type FocusedInput = Parameters<typeof shouldBlurInputOnClose>[0];

// `TextInput.State.currentlyFocusedInput()` returns `null` at run time when no field holds focus.
const NO_INPUT = null as unknown as FocusedInput;
const fakeInput = () => ({}) as unknown as FocusedInput;

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

describe('shouldBlurInputOnClose', () => {
  const inputAtOpen = fakeInput();
  const inputSince = fakeInput();

  it('blurs nothing when no input holds focus as the sheet closes', () => {
    expect(shouldBlurInputOnClose(NO_INPUT, NO_INPUT)).toBe(false);
    expect(shouldBlurInputOnClose(inputAtOpen, NO_INPUT)).toBe(false);
  });

  it('leaves the input that held focus when the sheet opened and still holds it', () => {
    expect(shouldBlurInputOnClose(inputAtOpen, inputAtOpen)).toBe(false);
  });

  it('blurs another input that took focus since the sheet opened', () => {
    expect(shouldBlurInputOnClose(inputAtOpen, inputSince)).toBe(true);
  });

  it('blurs an input that took focus since a sheet that opened with none focused', () => {
    expect(shouldBlurInputOnClose(NO_INPUT, inputSince)).toBe(true);
  });
});
