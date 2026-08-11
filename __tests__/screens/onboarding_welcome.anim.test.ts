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
const builder = {
  duration() {
    return this;
  },
  withInitialValues() {
    return this;
  },
  delay(d: number) {
    return { ...this, delayMs: d };
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
