import type { ButtonVariant } from 'heroui-native';

import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';

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
