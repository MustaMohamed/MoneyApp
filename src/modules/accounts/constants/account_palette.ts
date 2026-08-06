import { Strings } from '@/constants/strings';
import { AcctTokens, CoreTokens } from '@/constants/theme_tokens';

/**
 * The one account-colour source. 16 families x rich/soft, derived from
 * AcctTokens rather than copied, so a token change cannot leave the picker
 * painting a colour the rest of the app does not store.
 *
 * Array order is the sheet's column order (mockup D1/D2): 16 rich entries in
 * AcctTokens declaration order, then the same 16 families in soft.
 *
 * Three older colour lists still exist and are NOT touched here — the two
 * ACCOUNT_COLORS arrays in the add-account hooks and AccountColors in
 * constants/theme.ts. Their consumers are rewritten in MA-006/007/008.
 */

export type AccountColorFamily = keyof typeof AcctTokens;
export type AccountColorTone = 'rich' | 'soft';

export type AccountColorEntry = {
  family: AccountColorFamily;
  familyLabel: string;
  tone: AccountColorTone;
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

/** The only two colours a tick is ever drawn in — mockup --foreground / --accent-foreground. */
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

/** Whichever of the two tick colours is more legible on this swatch. */
function pickTickColor(hex: string): string {
  return contrastRatio(hex, TICK_LIGHT) >= contrastRatio(hex, TICK_DARK) ? TICK_LIGHT : TICK_DARK;
}

// The type predicate, not `as AccountColorFamily[]`: `typescript/no-unsafe-type-
// assertion` is "error" for src/ (.oxlintrc.json) and rejects the assertion form
// with "type '(...)[]' is more narrow than the original type". Measured, and
// there is no `Object.keys(...) as X[]` precedent anywhere in src/ to follow.
// The palette-order test below is what proves this covers all 16 families.
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
      hex,
      tickColor: pickTickColor(hex),
    };
  });
}

export const ACCOUNT_PALETTE: readonly AccountColorEntry[] = Object.freeze([
  ...entriesForTone('rich'),
  ...entriesForTone('soft'),
]);

const BY_HEX = new Map(ACCOUNT_PALETTE.map((entry) => [entry.hex.toUpperCase(), entry]));

/** Stored hex -> its family and tone. `undefined` for anything outside the 32. */
export function findAccountColor(hex: string): AccountColorEntry | undefined {
  return BY_HEX.get(hex.toUpperCase());
}
