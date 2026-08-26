import { renderHook } from '@testing-library/react-native';

/**
 * Same stub shape as `onboarding_welcome.anim.test.ts` — the library's own
 * mock leaves `useReducedMotion` unimplemented ("ADD ME IF NEEDED"), and every
 * link of the builder chain records its argument. An earlier version of that
 * stub carried only `delay` forward, so 2 of the 3 chain parameters went
 * unasserted and deleting `.withInitialValues` left the suite green while the
 * screen rose from FadeInDown's preset 25 (issue #233).
 */
const mockUseReducedMotion = jest.fn();
const mockFirstMount = jest.fn();
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
  useFirstMountEntering: (...args: unknown[]) => mockFirstMount(...args),
}));

import { useMoreAccountsAnim } from '@/modules/onboarding/screens/onboarding/more_accounts/more_accounts.anim';
import { ms } from '@/utils/responsive';

describe('useMoreAccountsAnim — spec §3 S6, S7', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReset();
    mockFirstMount.mockReset();
  });

  it('plays exactly two staggered entries on the first mount', async () => {
    mockUseReducedMotion.mockReturnValue(false);
    mockFirstMount.mockReturnValue(true);
    const { result } = await renderHook(() => useMoreAccountsAnim(true));
    const entries = Object.values(result.current) as unknown as { delayMs: number }[];
    // Literals, not RISE_DELAYS_MS[i] — restating the constant one line from
    // its definition is the vacuous shape §8 names. Two blocks, not four: the
    // list itself never animates (S6).
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.delayMs)).toEqual([0, 120]);
  });

  it('rises 10pt over 500ms, the same chain for both blocks', async () => {
    mockUseReducedMotion.mockReturnValue(false);
    mockFirstMount.mockReturnValue(true);
    const { result } = await renderHook(() => useMoreAccountsAnim(true));
    const entries = Object.values(result.current) as unknown as {
      durationMs: number;
      initialValues: { translateY: number };
    }[];
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.durationMs).toBe(500);
      // The spec's small lift, not FadeInDown's preset 25.
      expect(entry.initialValues).toEqual({ translateY: ms(10) });
    }
  });

  it('plays nothing at all under reduced motion — S7', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    mockFirstMount.mockReturnValue(true);
    const { result } = await renderHook(() => useMoreAccountsAnim(true));
    expect(Object.values(result.current)).toEqual([undefined, undefined]);
  });

  it('plays nothing on a remount — once per session', async () => {
    mockUseReducedMotion.mockReturnValue(false);
    mockFirstMount.mockReturnValue(false);
    const { result } = await renderHook(() => useMoreAccountsAnim(true));
    expect(Object.values(result.current)).toEqual([undefined, undefined]);
  });

  it('threads hasAccounts through to useFirstMountEntering as claim — #247', async () => {
    mockUseReducedMotion.mockReturnValue(false);
    mockFirstMount.mockReturnValue(false);
    await renderHook(() => useMoreAccountsAnim(false));
    expect(mockFirstMount).toHaveBeenCalledWith('more_accounts', false);
  });
});
