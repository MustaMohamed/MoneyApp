import { resolveKeyboardProps, shouldBlurInputOnClose } from '@/components/ui/sheet';

type FocusedInput = Parameters<typeof shouldBlurInputOnClose>[0]['focusedNow'];

const NO_INPUT: FocusedInput = null;
const fakeInput = () => ({}) as unknown as FocusedInput;
const BOTH_FLAGS = { liftsAboveKeyboard: true, blursInputOnClose: true };

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
    expect(
      shouldBlurInputOnClose({ ...BOTH_FLAGS, focusedAtOpen: NO_INPUT, focusedNow: NO_INPUT }),
    ).toBe(false);
    expect(
      shouldBlurInputOnClose({ ...BOTH_FLAGS, focusedAtOpen: inputAtOpen, focusedNow: NO_INPUT }),
    ).toBe(false);
  });

  it('leaves the input that held focus when the sheet opened and still holds it', () => {
    expect(
      shouldBlurInputOnClose({
        ...BOTH_FLAGS,
        focusedAtOpen: inputAtOpen,
        focusedNow: inputAtOpen,
      }),
    ).toBe(false);
  });

  it('blurs another input that took focus since the sheet opened', () => {
    expect(
      shouldBlurInputOnClose({ ...BOTH_FLAGS, focusedAtOpen: inputAtOpen, focusedNow: inputSince }),
    ).toBe(true);
  });

  it('blurs an input that took focus since a sheet that opened with none focused', () => {
    expect(
      shouldBlurInputOnClose({ ...BOTH_FLAGS, focusedAtOpen: NO_INPUT, focusedNow: inputSince }),
    ).toBe(true);
  });

  it('blurs nothing on a sheet that passes neither flag, with an input focused since it opened', () => {
    expect(
      shouldBlurInputOnClose({
        liftsAboveKeyboard: false,
        blursInputOnClose: false,
        focusedAtOpen: inputAtOpen,
        focusedNow: inputSince,
      }),
    ).toBe(false);
  });

  it('blurs an input focused since the open on `liftsAboveKeyboard` alone', () => {
    expect(
      shouldBlurInputOnClose({
        liftsAboveKeyboard: true,
        blursInputOnClose: false,
        focusedAtOpen: inputAtOpen,
        focusedNow: inputSince,
      }),
    ).toBe(true);
  });

  it('blurs an input focused since the open on `blursInputOnClose` alone', () => {
    expect(
      shouldBlurInputOnClose({
        liftsAboveKeyboard: false,
        blursInputOnClose: true,
        focusedAtOpen: inputAtOpen,
        focusedNow: inputSince,
      }),
    ).toBe(true);
  });
});
