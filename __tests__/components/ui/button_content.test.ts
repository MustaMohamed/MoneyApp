import type { ButtonVariant } from 'heroui-native';

import { resolveButtonContent, resolveFlatRadius } from '@/components/ui/button.content';
import { Strings } from '@/constants/strings';
import { Colors, Radius } from '@/constants/theme';

interface Row {
  variant: ButtonVariant;
  isLoading: boolean | undefined;
  label: string;
  loadingLabel: string | undefined;
  text: string;
  showSpinner: boolean;
  spinnerColor: string | undefined;
}

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

interface RadiusRow {
  variant: ButtonVariant;
  flat: boolean | undefined;
  radius: { borderRadius: number } | undefined;
}

const radiusRows: RadiusRow[] = [
  { variant: 'primary', flat: true, radius: { borderRadius: Radius.cta } },
  { variant: 'secondary', flat: true, radius: { borderRadius: Radius.cta } },
  { variant: 'ghost', flat: true, radius: { borderRadius: Radius.cta } },
  { variant: 'ghost', flat: undefined, radius: undefined },
  { variant: 'secondary', flat: undefined, radius: undefined },
  { variant: 'danger', flat: true, radius: undefined },
];

describe('resolveFlatRadius', () => {
  it.each(radiusRows)('$variant flat=$flat -> $radius', ({ variant, flat, radius }) => {
    expect(resolveFlatRadius({ variant, flat })).toEqual(radius);
  });
});
