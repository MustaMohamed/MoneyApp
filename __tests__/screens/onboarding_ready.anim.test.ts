import { renderHook } from '@testing-library/react-native';

/**
 * Same stub shape as `onboarding_more_accounts.anim.test.ts` — the library's
 * own mock leaves `useReducedMotion` unimplemented ("ADD ME IF NEEDED"), and
 * every link of the builder chain records its argument. An earlier version of
 * that stub carried only `delay` forward, so 2 of the 3 chain parameters went
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
  useFirstMountEntering: () => mockFirstMount(),
}));

import { useReadyAnim } from '@/modules/onboarding/screens/onboarding/ready/ready.anim';
import { ms } from '@/utils/responsive';

describe('useReadyAnim — mockup § F, `.rise-1` / `.rise-2` / `.rise-3`', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReset();
    mockFirstMount.mockReset();
  });

  it('plays exactly three staggered entries on the first mount', async () => {
    mockUseReducedMotion.mockReturnValue(false);
    mockFirstMount.mockReturnValue(true);
    const { result } = await renderHook(() => useReadyAnim());
    const entries = Object.values(result.current) as unknown as { delayMs: number }[];
    // Literals, not RISE_DELAYS_MS[i] — restating the constant one line from
    // its definition is the vacuous shape the spec names. Three blocks: the
    // intro, the hero card and the summary group. The CTA is not one of them
    // (mockup.html:2325/2332/2342 mark exactly three); the footer is a fixed
    // track and does not enter.
    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.delayMs)).toEqual([0, 120, 240]);
  });

  it('rises 10pt over 500ms, the same chain for all three blocks', async () => {
    mockUseReducedMotion.mockReturnValue(false);
    mockFirstMount.mockReturnValue(true);
    const { result } = await renderHook(() => useReadyAnim());
    const entries = Object.values(result.current) as unknown as {
      durationMs: number;
      initialValues: { translateY: number };
    }[];
    expect(entries).toHaveLength(3);
    for (const entry of entries) {
      expect(entry.durationMs).toBe(500);
      // The spec's small lift, not FadeInDown's preset 25.
      expect(entry.initialValues).toEqual({ translateY: ms(10) });
    }
  });

  it('plays nothing at all under reduced motion', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    mockFirstMount.mockReturnValue(true);
    const { result } = await renderHook(() => useReadyAnim());
    expect(Object.values(result.current)).toEqual([undefined, undefined, undefined]);
  });

  it('plays nothing on a remount — once per session', async () => {
    mockUseReducedMotion.mockReturnValue(false);
    mockFirstMount.mockReturnValue(false);
    const { result } = await renderHook(() => useReadyAnim());
    expect(Object.values(result.current)).toEqual([undefined, undefined, undefined]);
  });
});
