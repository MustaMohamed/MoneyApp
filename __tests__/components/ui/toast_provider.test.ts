import { TOAST_PROVIDER_PROPS, resolveToastInsets } from '@/components/ui/toast';

describe('the app toast configuration', () => {
  it('places toasts at the bottom', () => {
    expect(TOAST_PROVIDER_PROPS.defaultProps.placement).toBe('bottom');
  });

  it('shows one at a time', () => {
    expect(TOAST_PROVIDER_PROPS.maxVisibleToasts).toBe(1);
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
