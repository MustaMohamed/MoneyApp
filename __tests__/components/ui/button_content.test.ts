import type { ButtonVariant } from 'heroui-native';

import { resolveButtonContent } from '@/components/ui/button.content';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';

interface Row {
  variant: ButtonVariant;
  isLoading: boolean | undefined;
  label: string;
  loadingLabel: string | undefined;
  text: string;
  showSpinner: boolean;
  spinnerColor: string | undefined;
}

// Row 3 proves omission preserves today's behaviour byte for byte (button.tsx:31).
// Row 5 catches a gold spinner on a red destructive button.
const rows: Row[] = [
  {
    variant: 'primary',
    isLoading: undefined,
    label: 'Save',
    loadingLabel: undefined,
    text: 'Save',
    showSpinner: false,
    spinnerColor: undefined,
  },
  {
    variant: 'primary',
    isLoading: false,
    label: 'Save',
    loadingLabel: 'Saving…',
    text: 'Save',
    showSpinner: false,
    spinnerColor: undefined,
  },
  {
    variant: 'primary',
    isLoading: true,
    label: 'Save',
    loadingLabel: undefined,
    text: Strings.loading,
    showSpinner: true,
    spinnerColor: Colors.dark.bg,
  },
  {
    variant: 'primary',
    isLoading: true,
    label: 'Save',
    loadingLabel: 'Saving…',
    text: 'Saving…',
    showSpinner: true,
    spinnerColor: Colors.dark.bg,
  },
  {
    variant: 'danger',
    isLoading: true,
    label: 'Delete',
    loadingLabel: undefined,
    text: Strings.loading,
    showSpinner: true,
    spinnerColor: Colors.dark.text1,
  },
  {
    variant: 'secondary',
    isLoading: true,
    label: 'Fetch',
    loadingLabel: 'Fetching…',
    text: 'Fetching…',
    showSpinner: true,
    spinnerColor: undefined,
  },
  {
    variant: 'ghost',
    isLoading: true,
    label: 'Cancel',
    loadingLabel: undefined,
    text: Strings.loading,
    showSpinner: true,
    spinnerColor: undefined,
  },
];

describe('resolveButtonContent', () => {
  it.each(rows)(
    '$variant isLoading=$isLoading loadingLabel=$loadingLabel -> $text',
    ({ variant, isLoading, label, loadingLabel, text, showSpinner, spinnerColor }) => {
      expect(resolveButtonContent({ variant, label, isLoading, loadingLabel })).toEqual({
        text,
        showSpinner,
        spinnerColor,
      });
    },
  );
});
