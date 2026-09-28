import type { ButtonSize, ButtonVariant } from 'heroui-native';

import { Strings } from '@/constants/strings';
import { Colors, Radius } from '@/constants/theme';

import { resolveCompactCtaHeight } from './button.geometry';

const FLAT_VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];

export type FlatButtonTone = 'danger' | 'accent';

export interface FlatButtonStyle {
  style: { borderRadius: number; height?: number };
  rootClass?: string;
  labelClass?: string;
}

/** `flat` is the redesigned screens' treatment; only the variants it paints take `Radius.cta`. */
export function resolveFlatButtonStyle({
  variant,
  flat,
  tone,
  fontScale,
  size,
}: {
  variant: ButtonVariant;
  flat?: boolean;
  tone?: FlatButtonTone;
  /** Read only by the compact accent arm, whose pinned height grows with its label. */
  fontScale: number;
  size: ButtonSize;
}): FlatButtonStyle | undefined {
  if (flat !== true || !FLAT_VARIANTS.includes(variant)) return undefined;
  if (variant === 'ghost') {
    return {
      style: { borderRadius: Radius.cta },
      labelClass: tone === 'danger' ? 'text-danger' : undefined,
    };
  }
  if (variant !== 'secondary') return { style: { borderRadius: Radius.cta } };
  if (tone === 'accent') {
    return {
      style: {
        borderRadius: Radius.cta,
        height: resolveCompactCtaHeight(size, fontScale),
      },
      rootClass: 'bg-accent-soft',
      labelClass: 'text-accent',
    };
  }
  return {
    style: { borderRadius: Radius.cta },
    labelClass: tone === 'danger' ? 'text-danger' : 'text-foreground',
  };
}

export interface ButtonContentInput {
  variant: ButtonVariant;
  label: string;
  isLoading?: boolean;
  loadingLabel?: string;
}

export interface ButtonContent {
  text: string;
  showSpinner: boolean;
  /** undefined = Spinner's own 'default', which resolves to the theme accent. */
  spinnerColor?: string;
}

export function resolveButtonContent({
  variant,
  label,
  isLoading,
  loadingLabel,
}: ButtonContentInput): ButtonContent {
  if (!isLoading) {
    return { text: label, showSpinner: false };
  }

  const text = loadingLabel ?? Strings.loading;

  // The spinner's default gold is the primary CTA's own fill, so it would be invisible there.
  if (variant === 'primary') {
    return { text, showSpinner: true, spinnerColor: Colors.dark.bg };
  }
  if (variant === 'danger') {
    return { text, showSpinner: true, spinnerColor: Colors.dark.text1 };
  }

  return { text, showSpinner: true };
}
