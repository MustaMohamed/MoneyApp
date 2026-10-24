import type { ButtonVariant } from 'heroui-native';

import {
  resolveButtonContent,
  resolveButtonUnclipRadius,
  resolveFlatButtonStyle,
  type FlatButtonStyle,
  type FlatButtonTone,
} from '@/components/ui/button.content';
import { resolveButtonLabelStyle } from '@/components/ui/button.geometry';
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
  // C4's Delete account: transparent, danger label, at the CTA radius.
  {
    variant: 'ghost',
    flat: true,
    tone: 'danger',
    resolved: { style: { borderRadius: Radius.cta }, labelClass: 'text-danger' },
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
    expect(resolveFlatButtonStyle({ variant, flat, tone, size: 'md', fontScale: 1 })).toEqual(
      resolved,
    );
  });

  // The literal, not the token: a drifted `compactCtaTrack` must fail here, not on a device.
  it('the compact accent arm is 36 high, C4 `.unarch`', () => {
    expect(
      resolveFlatButtonStyle({
        variant: 'secondary',
        flat: true,
        tone: 'accent',
        size: 'md',
        fontScale: 1,
      })?.style.height,
    ).toBe(36);
  });

  it('the compact accent arm grows with the label at font scale 2', () => {
    const height = resolveFlatButtonStyle({
      variant: 'secondary',
      flat: true,
      tone: 'accent',
      fontScale: 2,
      size: 'md',
    })?.style.height;
    expect(height).toBeGreaterThanOrEqual(resolveButtonLabelStyle('md', 2)?.lineHeight ?? Infinity);
    expect(height).toBeGreaterThan(Size.compactCtaTrack);
  });

  it('no other flat shape pins a height', () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'danger'] as ButtonVariant[]) {
      expect(
        resolveFlatButtonStyle({ variant, flat: true, size: 'md', fontScale: 1 })?.style.height,
      ).toBeUndefined();
    }
  });
});

describe('resolveButtonUnclipRadius', () => {
  const flatStyle = resolveFlatButtonStyle({
    variant: 'secondary',
    flat: true,
    size: 'sm',
    fontScale: 1,
  });
  const slop = { top: 3, bottom: 3 };

  it('MA-242: a flat secondary sm button with a slop unclips at its own flat corners', () => {
    expect(flatStyle).toBeDefined();
    expect(resolveButtonUnclipRadius(flatStyle, 'sm', slop)).toBe(Radius.cta);
  });

  it("MA-248: a non-flat button with a slop unclips at HeroUI's root corners for its size", () => {
    expect(resolveButtonUnclipRadius(undefined, 'sm', slop)).toBe(Radius.heroButton);
    expect(resolveButtonUnclipRadius(undefined, 'lg', slop)).toBe(Radius.heroButtonLg);
  });

  it('MA-248: a non-flat sm button with a number slop unclips at the sm root corners', () => {
    expect(resolveButtonUnclipRadius(undefined, 'sm', 3)).toBe(Radius.heroButton);
  });

  it('MA-248: a button with no slop does not unclip, flat or not', () => {
    expect(resolveButtonUnclipRadius(flatStyle, 'sm', undefined)).toBeUndefined();
    expect(resolveButtonUnclipRadius(flatStyle, 'sm', null)).toBeUndefined();
    expect(resolveButtonUnclipRadius(undefined, 'sm', undefined)).toBeUndefined();
    expect(resolveButtonUnclipRadius(undefined, 'sm', null)).toBeUndefined();
  });
});
