import { Dimensions } from 'react-native';

import { Strings } from '@/constants/strings';
import { Size, Spacing, TouchSize } from '@/constants/theme';
import {
  ACCOUNT_PALETTE,
  findAccountColor,
  type AccountColorEntry,
  type AccountColorTone,
} from '@/modules/accounts/constants/account_palette';

// Keep width-dependent values as parameters: jest-expo pins `Dimensions`, so tests cannot sweep.

// mockup D1/D2: eight columns, two rows per tone block.
export const ACCOUNT_COLOR_GRID_COLUMNS = 8;
export const ACCOUNT_COLOR_GRID_ROWS_PER_BLOCK = 2;

// `ms(3)` and `ms(2)` are the identity across the [0.85, 1.15] clamp, so these stay literals.
export const ACCOUNT_COLOR_CELL_PADDING = 3;
export const ACCOUNT_COLOR_CELL_RING_WIDTH = 2;

export const ACCOUNT_COLOR_CELL_HEIGHT = Math.max(Size.dialogButton, TouchSize.min);

export interface ColorGridMetricsInput {
  screenWidth: number;
  horizontalPadding: number;
  gap: number;
  cellHeight: number;
  columns?: number;
}

export interface ColorGridMetrics {
  cellWidth: number;
  cellHeight: number;
  hitSlopX: number;
  effectiveWidth: number;
}

export function resolveColorGridMetrics(input: ColorGridMetricsInput): ColorGridMetrics {
  const columns = input.columns ?? ACCOUNT_COLOR_GRID_COLUMNS;
  // No rounding: 41.25 is the mockup's number and RN lays out sub-pixel widths fine.
  const cellWidth =
    (input.screenWidth - 2 * input.horizontalPadding - (columns - 1) * input.gap) / columns;
  const hitSlopX = Math.floor(input.gap / 2);
  return {
    cellWidth,
    cellHeight: input.cellHeight,
    hitSlopX,
    effectiveWidth: cellWidth + 2 * hitSlopX,
  };
}

// Portrait-locked, so this module-scope read is correct; do not swap in `useWindowDimensions`.
export const ACCOUNT_COLOR_GRID_METRICS = resolveColorGridMetrics({
  screenWidth: Dimensions.get('window').width,
  horizontalPadding: Spacing.md,
  gap: Spacing.xxs,
  cellHeight: ACCOUNT_COLOR_CELL_HEIGHT,
});

export interface ColorGridBlock {
  tone: AccountColorTone;
  label: string;
  hint: string;
  caption: string;
  rows: AccountColorEntry[][];
}

const TONE_BLOCK_COPY: Record<AccountColorTone, { label: string; hint: string; caption: string }> =
  {
    rich: {
      label: Strings.accountColorToneRich,
      hint: Strings.accountColorToneRichHint,
      caption: Strings.accountColorToneRichCaption,
    },
    soft: {
      label: Strings.accountColorToneSoft,
      hint: Strings.accountColorToneSoftHint,
      caption: Strings.accountColorToneSoftCaption,
    },
  };

// Column pairing relies on the palette's two tone halves already being in identical family order.
export function resolveAccountColorGrid(
  palette: readonly AccountColorEntry[] = ACCOUNT_PALETTE,
): ColorGridBlock[] {
  const tones: AccountColorTone[] = ['rich', 'soft'];
  return tones.map((tone) => {
    const entries = palette.filter((entry) => entry.tone === tone);
    const rows: AccountColorEntry[][] = [];
    for (let i = 0; i < entries.length; i += ACCOUNT_COLOR_GRID_COLUMNS) {
      rows.push(entries.slice(i, i + ACCOUNT_COLOR_GRID_COLUMNS));
    }
    return { tone, ...TONE_BLOCK_COPY[tone], rows };
  });
}

export function accountColorSwatchLabel(entry: AccountColorEntry): string {
  return Strings.accountColorSwatchA11y(entry.familyLabel, entry.tone);
}

export interface ColorTriggerModel {
  hex: string;
  familyLabel: string;
  toneLabel: string;
  a11yLabel: string;
}

// The miss branch is unreachable today; it stops a hand-edited hex white-screening the form.
export function resolveColorTriggerModel(hex: string): ColorTriggerModel {
  const entry = findAccountColor(hex);
  if (entry) {
    return {
      hex: entry.hex,
      familyLabel: entry.familyLabel,
      toneLabel: entry.toneLabel,
      a11yLabel: Strings.accountColorTriggerA11y(entry.familyLabel, entry.tone),
    };
  }
  return {
    hex,
    familyLabel: Strings.accountColorCustom,
    toneLabel: '',
    a11yLabel: Strings.accountColorTriggerA11y(Strings.accountColorCustom, ''),
  };
}
