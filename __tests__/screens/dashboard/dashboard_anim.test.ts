import { renderHook } from '@testing-library/react-native';

// Self-contained: the real module and its own mock throw at import, and the hero entrance is built at import.
jest.mock('react-native-reanimated', () => {
  const builder = jest
    .requireActual<typeof import('@/test_helpers/mock_reanimated_builder')>(
      '@/test_helpers/mock_reanimated_builder',
    )
    .mockEnteringBuilder();
  return { FadeInDown: builder, FadeInUp: builder };
});

import { useDashboardAnim } from '@/modules/dashboard/screens/dashboard/dashboard.anim';

type Recorded = {
  durationMs?: number;
  delayMs?: number;
  initialValues?: { translateY: number };
};

function recorded(entering: unknown): Recorded {
  return entering as Recorded;
}

describe('useDashboardAnim — the hero enters on the opening render of Home only (MA-195)', () => {
  it('fades the hero in and rises it 16 dp over 400 ms on the first render', async () => {
    const { result } = await renderHook(() => useDashboardAnim());

    expect(result.current.heroEntering).toBeDefined();
    expect(recorded(result.current.heroEntering)).toMatchObject({
      durationMs: 400,
      initialValues: { translateY: 16 },
    });
  });

  it('returns no hero entrance on a later render, while the stat and section entrances stay', async () => {
    const { result, rerender } = await renderHook(() => useDashboardAnim());
    expect(result.current.heroEntering).toBeDefined();

    await rerender(undefined);

    expect('heroEntering' in result.current).toBe(true);
    expect(result.current.heroEntering).toBeUndefined();
    expect(recorded(result.current.statsEntering)).toMatchObject({ delayMs: 150, durationMs: 300 });
    expect(recorded(result.current.sectionEntering(1))).toMatchObject({
      delayMs: 330,
      durationMs: 300,
    });
  });

  it('gives a new Home its hero entrance again on its first render', async () => {
    const first = await renderHook(() => useDashboardAnim());
    await first.rerender(undefined);
    expect(first.result.current.heroEntering).toBeUndefined();

    const second = await renderHook(() => useDashboardAnim());

    expect(second.result.current.heroEntering).toBeDefined();
    expect(recorded(second.result.current.heroEntering)).toMatchObject({
      durationMs: 400,
      initialValues: { translateY: 16 },
    });
  });
});
