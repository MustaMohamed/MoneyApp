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
