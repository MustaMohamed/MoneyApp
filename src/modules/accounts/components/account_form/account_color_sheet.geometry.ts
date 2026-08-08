import { Dimensions } from 'react-native';

import { Strings } from '@/constants/strings';
import { Size, Spacing, TouchSize } from '@/constants/theme';
import {
  ACCOUNT_PALETTE,
  findAccountColor,
  type AccountColorEntry,
  type AccountColorTone,
} from '@/modules/accounts/constants/account_palette';

/**
 * Pure geometry, grid model and a11y-label resolvers for the 32-colour sheet
 * (MA-006). Every width-dependent value is a parameter, never a module-scope
 * token read, so a unit test can sweep screen widths despite jest-expo
 * pinning `Dimensions` to a single value. See plan step 3 for the reasoning.
 */

// mockup D1/D2: eight columns, two rows per tone block.
export const ACCOUNT_COLOR_GRID_COLUMNS = 8;
export const ACCOUNT_COLOR_GRID_ROWS_PER_BLOCK = 2;

// ms(3) and ms(2) are the identity at both ends of the [0.85, 1.15] clamp
// (Math.round(3 * 0.85) = 3, Math.round(3 * 1.15) = 3, same for 2) — writing
// them through ms() would be a literal wearing a token, the same reasoning
// onboarding_shell.geometry.ts:26-32 already applied to Size.hairline.
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
  // No Math.round on cellWidth — 41.25 is the mockup's number and RN lays out
  // sub-pixel widths fine.
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

/**
 * Portrait-locked (app.json "orientation": "portrait"), so a module-scope read
 * is correct and matches what utils/responsive.ts:12 already does. Do not swap
 * this for useWindowDimensions — a hook here would make the component the only
 * consumer of a value the test has to reach without rendering.
 */
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

/**
 * Chunks the palette into the two tone blocks the sheet renders, each split
 * into rows of ACCOUNT_COLOR_GRID_COLUMNS. Because the palette's two halves
 * are already in identical family order (account_palette.ts:101-104, proven
 * by account_palette.test.ts:50-62), an identical chunk of both halves is
 * what produces the column pairing the Done-when clause requires.
 */
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

/**
 * The miss branch is unreachable today (both creation paths write
 * AcctTokens.*.rich — see account_palette.test.ts:104-111) and exists so a
 * hand-edited row cannot white-screen the form.
 */
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
