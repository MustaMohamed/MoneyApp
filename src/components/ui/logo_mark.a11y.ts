export interface NamedLogoMarkA11y {
  container: {
    accessible: true;
    accessibilityRole: 'image';
    accessibilityLabel: string;
  };
  graphic: {
    importantForAccessibility: 'no-hide-descendants';
    accessibilityElementsHidden: true;
  };
}

export interface DecorativeLogoMarkA11y {
  container: {
    accessible: false;
    importantForAccessibility: 'no-hide-descendants';
    accessibilityElementsHidden: true;
  };
  graphic: {
    importantForAccessibility: 'no-hide-descendants';
    accessibilityElementsHidden: true;
  };
}

export type LogoMarkA11y = NamedLogoMarkA11y | DecorativeLogoMarkA11y;

/**
 * Named when a caller passes a label (the role is "image": a logo is a
 * graphic, unlike DisplayHeadline's SVG text — see logo_mark.tsx's role note),
 * decorative and hidden from the accessibility tree otherwise. Decorative is
 * the default because the only call site this scope has, the N1 header, sits
 * a `MoneyApp` wordmark right beside the mark — naming both would announce the
 * app twice.
 *
 * `graphic` is the same hidden pair in both branches: the drawing itself never
 * surfaces a second node, whether or not the wrapper carries a name. Mirrors
 * the shape `resolveDisplayHeadlineA11y` (display_headline.geometry.ts) ships.
 */
export function resolveLogoMarkA11y(label: string): NamedLogoMarkA11y;
export function resolveLogoMarkA11y(): DecorativeLogoMarkA11y;
export function resolveLogoMarkA11y(label?: string): LogoMarkA11y;
export function resolveLogoMarkA11y(label?: string): LogoMarkA11y {
  const graphic = {
    importantForAccessibility: 'no-hide-descendants' as const,
    accessibilityElementsHidden: true as const,
  };

  if (label !== undefined) {
    return {
      container: { accessible: true, accessibilityRole: 'image', accessibilityLabel: label },
      graphic,
    };
  }

  return {
    container: {
      accessible: false,
      importantForAccessibility: 'no-hide-descendants',
      accessibilityElementsHidden: true,
    },
    graphic,
  };
}
