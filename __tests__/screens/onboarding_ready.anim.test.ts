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
    // Three entries: intro, hero card, summary group (mockup.html:2325/2332/2342); CTA excluded.
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
      // Without `withInitialValues`, FadeInDown enters from its preset translateY of 25.
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
