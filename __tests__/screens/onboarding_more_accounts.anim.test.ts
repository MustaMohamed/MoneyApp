import { renderHook } from '@testing-library/react-native';

// Reanimated's own jest mock leaves `useReducedMotion` unimplemented, so stub the chain here.
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
    // Literals, not the delay constant; only two blocks animate because the list never does.
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
      // A 10pt lift, not FadeInDown's preset 25.
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
