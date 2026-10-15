import { TOAST_PROVIDER_PROPS, resolveToastInsets } from '@/components/ui/toast';

jest.mock('react-native-reanimated', () =>
  jest
    .requireActual<typeof import('@/test_helpers/mock_reanimated_fade')>(
      '@/test_helpers/mock_reanimated_fade',
    )
    .mockReanimatedFade(),
);

describe('the app toast configuration', () => {
  it('places toasts at the bottom', () => {
    expect(TOAST_PROVIDER_PROPS.defaultProps.placement).toBe('bottom');
  });

  it('shows one at a time', () => {
    expect(TOAST_PROVIDER_PROPS.maxVisibleToasts).toBe(1);
  });

  it('fades every toast in over 200 ms and out over 150 ms where it rests, at either placement', () => {
    expect(TOAST_PROVIDER_PROPS.defaultProps.animation).toStrictEqual({
      entering: { top: { fade: 'in', ms: 200 }, bottom: { fade: 'in', ms: 200 } },
      exiting: { top: { fade: 'out', ms: 150 }, bottom: { fade: 'out', ms: 150 } },
    });
  });
});

describe('resolveToastInsets', () => {
  it("leaves HeroUI's default insets when no tab bar holds a clearance", () => {
    expect(resolveToastInsets(undefined)).toBeUndefined();
  });

  it('sets only the bottom inset to a held clearance', () => {
    expect(resolveToastInsets(120)).toStrictEqual({ bottom: 120 });
  });
});
