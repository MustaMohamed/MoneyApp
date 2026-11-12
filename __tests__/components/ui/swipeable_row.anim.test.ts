import { renderHook } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => ({
  useAnimatedStyle: (factory: () => Record<string, unknown>) => factory(),
}));

import { useRestingActionsHidden } from '@/components/ui/swipeable_row.anim';

describe('useRestingActionsHidden', () => {
  it('hides the action tiles while the row rests closed', async () => {
    const { result } = await renderHook(() =>
      useRestingActionsHidden({ value: 0 } as Parameters<typeof useRestingActionsHidden>[0]),
    );
    expect(result.current).toEqual({ opacity: 0 });
  });

  it('shows them as soon as the row starts to open', async () => {
    const { result } = await renderHook(() =>
      useRestingActionsHidden({ value: 0.01 } as Parameters<typeof useRestingActionsHidden>[0]),
    );
    expect(result.current).toEqual({ opacity: 1 });
  });
});
