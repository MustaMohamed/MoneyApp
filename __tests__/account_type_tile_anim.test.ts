import { act, renderHook } from '@testing-library/react-native';

/**
 * Impl review round 1, D6: neither the plan nor `## Emulator verification`'s
 * skip of the reduced-motion walk was backed by a test — this is that test.
 * `react-native-reanimated/mock` deliberately leaves `useReducedMotion`
 * unimplemented ("ADD ME IF NEEDED"), so it is stubbed here directly; the
 * spring primitives are call-recording fakes rather than real physics,
 * because the only thing observable in a jest environment is whether the
 * write path (`scale.value = withSequence(...)`) runs at all.
 */
// Jest's mock-hoisting guard only allows out-of-scope variables named
// `mock*` (case-insensitive) inside a jest.mock() factory.
const mockUseReducedMotion = jest.fn();
const mockWithSpring = jest.fn((value: number, _config?: unknown) => value);
const mockWithSequence = jest.fn((...values: number[]) => values[values.length - 1]);

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (factory: () => Record<string, unknown>) => factory(),
  useReducedMotion: () => mockUseReducedMotion(),
  withSequence: (...values: number[]) => mockWithSequence(...values),
  withSpring: (value: number, config?: unknown) => mockWithSpring(value, config),
}));

import { useAccountTypeTileAnim } from '@/modules/accounts/components/account_form/account_form.anim';

describe('useAccountTypeTileAnim — spec.md § Motion budget', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReset();
    mockWithSpring.mockClear();
    mockWithSequence.mockClear();
  });

  it('leaves the shared value untouched when reduced motion is on', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { result } = await renderHook(() => useAccountTypeTileAnim());

    await act(() => {
      result.current.triggerTileTap();
    });

    // The only statement that can write scale.value is
    // `scale.value = withSequence(withSpring(...), withSpring(...))` — if
    // withSequence/withSpring were never called, that assignment never ran.
    expect(mockWithSequence).not.toHaveBeenCalled();
    expect(mockWithSpring).not.toHaveBeenCalled();
    expect(result.current.tileAnim).toEqual({ transform: [{ scale: 1 }] });
  });

  it('writes the shared value through the spring pop when reduced motion is off', async () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { result } = await renderHook(() => useAccountTypeTileAnim());

    await act(() => {
      result.current.triggerTileTap();
    });

    expect(mockWithSequence).toHaveBeenCalledTimes(1);
    expect(mockWithSpring).toHaveBeenCalledTimes(2);
    expect(mockWithSpring).toHaveBeenNthCalledWith(1, 1.03, { damping: 8, stiffness: 200 });
    expect(mockWithSpring).toHaveBeenNthCalledWith(2, 1, { damping: 12 });
  });
});
