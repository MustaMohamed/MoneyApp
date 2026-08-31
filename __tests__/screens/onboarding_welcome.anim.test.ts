import { renderHook } from '@testing-library/react-native';

// Reanimated's own mock leaves `useReducedMotion` unimplemented, so stub the module here.
const mockUseReducedMotion = jest.fn();
const mockFirstMount = jest.fn();
// Each link records its argument; returning `this` would leave chain parameters unasserted.
const builder = {
  duration(durationMs: number) {
    return { ...this, durationMs };
  },
  withInitialValues(initialValues: { translateY: number }) {
    return { ...this, initialValues };
  },
  delay(delayMs: number) {
    return { ...this, delayMs };
  },
};
jest.mock('react-native-reanimated', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
  FadeInDown: builder,
}));
jest.mock('@/utils/use_first_mount_entering.hook', () => ({
  useFirstMountEntering: () => mockFirstMount(),
}));

import { useWelcomeAnim } from '@/modules/onboarding/screens/onboarding/welcome/welcome.anim';
import { ms } from '@/utils/responsive';

describe('useWelcomeAnim — spec.md § Motion budget', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReset();
    mockFirstMount.mockReset();
  });

  it('plays four staggered entries on the first mount', async () => {
    mockUseReducedMotion.mockReturnValue(false);
    mockFirstMount.mockReturnValue(true);
    const { result } = await renderHook(() => useWelcomeAnim());
    expect(Object.values(result.current).map((e: any) => e.delayMs)).toEqual([0, 120, 240, 360]);
  });

  it('rises 10pt over 500ms, the same for every block', async () => {
    mockUseReducedMotion.mockReturnValue(false);
    mockFirstMount.mockReturnValue(true);
    const { result } = await renderHook(() => useWelcomeAnim());
    const entries = Object.values(result.current) as unknown as {
      durationMs: number;
      initialValues: { translateY: number };
    }[];
    expect(entries).toHaveLength(4);
    for (const entry of entries) {
      expect(entry.durationMs).toBe(500);
      // Not FadeInDown's preset 25.
      expect(entry.initialValues).toEqual({ translateY: ms(10) });
    }
  });

  it('plays nothing at all under reduced motion — spec.md § Motion budget', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    mockFirstMount.mockReturnValue(true);
    const { result } = await renderHook(() => useWelcomeAnim());
    expect(Object.values(result.current)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('plays nothing on a remount', async () => {
    mockUseReducedMotion.mockReturnValue(false);
    mockFirstMount.mockReturnValue(false);
    const { result } = await renderHook(() => useWelcomeAnim());
    expect(Object.values(result.current)).toEqual([undefined, undefined, undefined, undefined]);
  });
});
