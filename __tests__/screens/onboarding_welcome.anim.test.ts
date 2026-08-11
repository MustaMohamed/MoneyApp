import { renderHook } from '@testing-library/react-native';

/**
 * Mocking react-native-reanimated the way __tests__/account_type_tile_anim
 * .test.ts:14-24 does — the library's own mock leaves useReducedMotion
 * unimplemented ("ADD ME IF NEEDED"). FadeInDown is stubbed as a chainable
 * builder whose methods all return `this`, so it survives any call-chain
 * order: `.duration(500).delay(d).withInitialValues(...)` needs three links
 * to resolve, and only `delay` needs to actually carry a value forward.
 */
const mockUseReducedMotion = jest.fn();
const mockFirstMount = jest.fn();
// Every link records its argument. The earlier stub returned `this` from
// duration() and withInitialValues() and carried only the delay forward, so
// 2 of the 3 chain parameters were unasserted: deleting `.withInitialValues`
// left the suite green while the screen animated from FadeInDown's preset 25.
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
      // The spec's small lift, not FadeInDown's preset 25.
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
