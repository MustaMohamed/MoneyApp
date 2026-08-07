import { resolveLogoMarkA11y } from '@/components/ui/logo_mark.a11y';
import { Strings } from '@/constants/strings';

describe('logo mark accessibility', () => {
  it('names the mark with the caller-supplied label at role image', () => {
    const a11y = resolveLogoMarkA11y(Strings.logoMarkA11y);
    expect(a11y.container.accessible).toBe(true);
    expect(a11y.container.accessibilityRole).toBe('image');
    expect(a11y.container.accessibilityLabel).toBe('MoneyApp logo');
  });

  it('is silent by default', () => {
    // The N1 header renders the `MoneyApp` wordmark beside the mark. Naming both
    // announces the app twice. Decorative is the default because that is the
    // only call site this scope has.
    const a11y = resolveLogoMarkA11y();
    expect(a11y.container.accessible).toBe(false);
    expect(a11y.container).not.toHaveProperty('accessibilityLabel');
    expect(a11y.container.importantForAccessibility).toBe('no-hide-descendants');
    expect(a11y.container.accessibilityElementsHidden).toBe(true);
  });

  it('never lets the drawing surface a second node', () => {
    for (const a11y of [resolveLogoMarkA11y(), resolveLogoMarkA11y(Strings.logoMarkA11y)]) {
      expect(a11y.graphic.importantForAccessibility).toBe('no-hide-descendants');
      expect(a11y.graphic.accessibilityElementsHidden).toBe(true);
    }
  });
});
