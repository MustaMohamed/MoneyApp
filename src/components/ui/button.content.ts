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

/**
 * Pure busy-button resolver. Split out of button.tsx so both Done-when cases
 * — the supplied loadingLabel and the omitted one — are provable without
 * rendering anything.
 */
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

  // The spinner's own default colour resolves to the theme accent gold, which
  // is the exact fill of the primary CTA — a default-coloured spinner on the
  // primary button is invisible. Do not delete this as "the redundant colour
  // prop": it is what keeps the spinner visible on the two variants that paint
  // a solid fill close to the spinner's own default.
  if (variant === 'primary') {
    return { text, showSpinner: true, spinnerColor: Colors.dark.bg };
  }
  if (variant === 'danger') {
    return { text, showSpinner: true, spinnerColor: Colors.dark.text1 };
  }

  return { text, showSpinner: true };
}
