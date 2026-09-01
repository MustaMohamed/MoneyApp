import { Strings } from '@/constants/strings';
import { AcctTokens, CoreTokens } from '@/constants/theme_tokens';

export type AccountColorFamily = keyof typeof AcctTokens;
export type AccountColorTone = 'rich' | 'soft';

export type AccountColorEntry = {
  family: AccountColorFamily;
  familyLabel: string;
  tone: AccountColorTone;
  /** Display name for the tone; the sheet and the trigger row never build this string. */
  toneLabel: string;
  hex: string;
  /** Colour a check glyph must be drawn in to stay legible on `hex`. */
  tickColor: string;
};

const FAMILY_LABELS: Record<AccountColorFamily, string> = {
  midnight: Strings.accountColorMidnight,
  gold: Strings.accountColorGold,
  nile: Strings.accountColorNile,
  paprika: Strings.accountColorPaprika,
  plum: Strings.accountColorPlum,
  lapis: Strings.accountColorLapis,
  rose: Strings.accountColorRose,
  sand: Strings.accountColorSand,
  amethyst: Strings.accountColorAmethyst,
  emerald: Strings.accountColorEmerald,
  saffron: Strings.accountColorSaffron,
  steel: Strings.accountColorSteel,
  jade: Strings.accountColorJade,
  indigo: Strings.accountColorIndigo,
  coral: Strings.accountColorCoral,
  graphite: Strings.accountColorGraphite,
};

const TONE_LABELS: Record<AccountColorTone, string> = {
  rich: Strings.accountColorToneRich,
  soft: Strings.accountColorToneSoft,
};

/** The only two colours a tick is ever drawn in: mockup --foreground / --accent-foreground. */
const TICK_LIGHT = CoreTokens.text1; // #F0EBE3
const TICK_DARK = CoreTokens.bg; // #0F1923

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance of a #RRGGBB string. */
function relativeLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 0xff) +
    0.7152 * channel((n >> 8) & 0xff) +
    0.0722 * channel(n & 0xff)
  );
}

/** WCAG contrast ratio between two #RRGGBB strings. 1 (identical) to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function pickTickColor(hex: string): string {
  return contrastRatio(hex, TICK_LIGHT) >= contrastRatio(hex, TICK_DARK) ? TICK_LIGHT : TICK_DARK;
}

// Type predicate, not `as`: `typescript/no-unsafe-type-assertion` is an error for `src/`.
const FAMILIES = Object.keys(AcctTokens).filter(
  (key): key is AccountColorFamily => key in AcctTokens,
);

function entriesForTone(tone: AccountColorTone): AccountColorEntry[] {
  return FAMILIES.map((family) => {
    const hex = AcctTokens[family][tone];
    return {
      family,
      familyLabel: FAMILY_LABELS[family],
      tone,
      toneLabel: TONE_LABELS[tone],
      hex,
      tickColor: pickTickColor(hex),
    };
  });
}

// Array order is the sheet's column order: 16 rich in `AcctTokens` order, then the same 16 soft.
export const ACCOUNT_PALETTE: readonly AccountColorEntry[] = Object.freeze([
  ...entriesForTone('rich'),
  ...entriesForTone('soft'),
]);

const BY_HEX = new Map(ACCOUNT_PALETTE.map((entry) => [entry.hex.toUpperCase(), entry]));

/** Stored hex -> its family and tone. `undefined` for anything outside the 32. */
export function findAccountColor(hex: string): AccountColorEntry | undefined {
  return BY_HEX.get(hex.toUpperCase());
}

export const DEFAULT_ACCOUNT_COLOR: string = AcctTokens.midnight.rich;
