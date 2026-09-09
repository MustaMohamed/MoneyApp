import type { ButtonVariant } from 'heroui-native';

import {
  resolveButtonContent,
  resolveFlatButtonStyle,
  type FlatButtonStyle,
  type FlatButtonTone,
} from '@/components/ui/button.content';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Size } from '@/constants/theme';

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

interface FlatRow {
  variant: ButtonVariant;
  flat: boolean | undefined;
  tone: FlatButtonTone | undefined;
  resolved: FlatButtonStyle | undefined;
}

const flatRows: FlatRow[] = [
  {
    variant: 'primary',
    flat: true,
    tone: undefined,
    resolved: { style: { borderRadius: Radius.cta } },
  },
  {
    variant: 'secondary',
    flat: true,
    tone: undefined,
    resolved: { style: { borderRadius: Radius.cta }, labelClass: 'text-foreground' },
  },
  {
    variant: 'ghost',
    flat: true,
    tone: undefined,
    resolved: { style: { borderRadius: Radius.cta } },
  },
  // The gate this ticket opens: the confirm surfaces' Archive and Delete are flat danger.
  {
    variant: 'danger',
    flat: true,
    tone: undefined,
    resolved: { style: { borderRadius: Radius.cta } },
  },
  {
    variant: 'secondary',
    flat: true,
    tone: 'danger',
    resolved: { style: { borderRadius: Radius.cta }, labelClass: 'text-danger' },
  },
  {
    variant: 'secondary',
    flat: true,
    tone: 'accent',
    resolved: {
      style: { borderRadius: Radius.cta, height: Size.compactCtaTrack },
      rootClass: 'bg-accent-soft',
      labelClass: 'text-accent',
    },
  },
  { variant: 'ghost', flat: undefined, tone: undefined, resolved: undefined },
  { variant: 'secondary', flat: undefined, tone: undefined, resolved: undefined },
  { variant: 'danger', flat: undefined, tone: undefined, resolved: undefined },
];

describe('resolveFlatButtonStyle', () => {
  it.each(flatRows)('$variant flat=$flat tone=$tone', ({ variant, flat, tone, resolved }) => {
    expect(resolveFlatButtonStyle({ variant, flat, tone })).toEqual(resolved);
  });

  // The literal, not the token: a drifted `compactCtaTrack` must fail here, not on a device.
  it('the compact accent arm is 36 high, C4 `.unarch`', () => {
    expect(
      resolveFlatButtonStyle({ variant: 'secondary', flat: true, tone: 'accent' })?.style.height,
    ).toBe(36);
  });

  it('no other flat shape pins a height', () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'danger'] as ButtonVariant[]) {
      expect(resolveFlatButtonStyle({ variant, flat: true })?.style.height).toBeUndefined();
    }
  });
});
