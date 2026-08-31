import { act, renderHook } from '@testing-library/react-native';

// Reanimated's mock lacks `useReducedMotion`; jest.mock factories need `mock*` names.
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

    // `scale.value` is only written via `withSequence(withSpring(...))`; no calls means no write.
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
