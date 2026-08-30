import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Colors } from '@/constants/theme';
import { CoreTokens, InfoTokens, SemanticTokens } from '@/constants/theme_tokens';

/**
 * Cross-source agreement pin for #264: `theme.ts` (`Colors.dark`), `theme_tokens.ts`
 * (`SemanticTokens`/`CoreTokens`), and `global.css` each state these colours
 * independently, and nothing before this test caught them drifting apart — the
 * `warning` fork (`theme.ts`'s `#D4830A` vs everywhere else's `#E8B130`) shipped a
 * live dashboard-vs-detail mismatch.
 *
 * Derived from `Object.keys(SemanticTokens)` (the `typography_tokens.test.ts`
 * shape), not hand-enumerated: a first draft that hand-picked four keys missed a
 * live `info` fork (`SemanticTokens.info` `#4A7ABF` vs global.css's rendered
 * `#499EE0`, both consumed at `transactions_card.tsx:258,:264` beside the
 * `text-info` className rendering the other value in the same card) purely
 * because `info` wasn't one of the four cases someone thought to type. Iterating
 * every key SemanticTokens actually declares means a fifth token added there is
 * covered without anyone remembering to add a case.
 *
 * Same `readFileSync` + regex approach as `typography_tokens.test.ts`, the
 * precedent for reading `global.css` from a logic-only `.ts` suite — tests.md's
 * carve-out: a CSS-first token declaration is not the "file contents" M35 bans.
 */

function globalCss(): string {
  return readFileSync(resolve(process.cwd(), 'global.css'), 'utf8');
}

/**
 * #rrggbb, lowercased, from either a `#hex` global.css value or a Tailwind-v4
 * `r g b` triple (the form `--info`/`--accent-cc` use so `rgb(var(--x))` can add
 * alpha) — `--info: 73 158 224;` is not the `#hex` shape the original version of
 * this file only handled.
 */
function normalizeCssColor(raw: string): string {
  const hex = /^#([0-9a-fA-F]{6})$/.exec(raw.trim());
  if (hex) return `#${hex[1]!.toLowerCase()}`;

  const triple = /^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/.exec(raw.trim());
  if (triple) {
    const [, r, g, b] = triple;
    return `#${[r, g, b].map((c) => Number(c).toString(16).padStart(2, '0')).join('')}`;
  }

  throw new Error(`unrecognised colour value in global.css: "${raw}"`);
}

/** Every value assigned to `--name:` in global.css, normalized to #rrggbb. */
function cssVarValues(css: string, name: string): string[] {
  const pattern = new RegExp(`--${name}:\\s*([^;]+);`, 'g');
  return [...css.matchAll(pattern)].map(([, raw]) => normalizeCssColor(raw!));
}

function hexToRgbChannels(hex: string): [number, number, number] {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!match) throw new Error(`not a 6-digit hex colour: ${hex}`);
  const [, r, g, b] = match;
  return [parseInt(r!, 16), parseInt(g!, 16), parseInt(b!, 16)];
}

// theme.ts's `Colors.dark` key for a SemanticTokens key, where one exists. `info` has
// none — no dashboard surface reads it through `Colors.dark` — so it's checked
// against theme_tokens.ts and global.css only, below.
const DARK_KEY: Partial<Record<keyof typeof SemanticTokens, keyof typeof Colors.dark>> = {
  positive: 'positive',
  negative: 'negative',
  warning: 'warning',
};

// The global.css variable name for each SemanticTokens key. A `Record`, not a
// lookup with a fallback: a token added to SemanticTokens without an entry here
// is a compile error, not a silently-skipped case.
const CSS_VAR: Record<keyof typeof SemanticTokens, string> = {
  positive: 'success',
  negative: 'danger',
  warning: 'warning',
  info: 'info',
};

// A type guard, not a cast: `Object.keys` only ever returns `string[]` by TS's own
// rules, and every one of those strings genuinely is a `SemanticTokens` key at
// runtime — this proves it instead of asserting it.
function isSemanticTokenKey(key: string): key is keyof typeof SemanticTokens {
  return key in SemanticTokens;
}

describe('semantic colour agreement — theme.ts vs theme_tokens.ts vs global.css', () => {
  const css = globalCss();

  it.each(Object.keys(SemanticTokens))('%s: every source that declares it agrees', (key) => {
    if (!isSemanticTokenKey(key)) throw new Error(`not a SemanticTokens key: ${key}`);

    const tokenValue = SemanticTokens[key].toLowerCase();

    const darkKey = DARK_KEY[key];
    if (darkKey) {
      expect(Colors.dark[darkKey].toLowerCase()).toBe(tokenValue);
    }

    // The light block deliberately duplicates the dark block's values in this file.
    const cssValues = cssVarValues(css, CSS_VAR[key]);
    expect(cssValues).toHaveLength(2);
    for (const value of cssValues) {
      expect(value).toBe(tokenValue);
    }
  });

  it('text2 agrees across theme.ts, theme_tokens.ts, and global.css', () => {
    // Not a SemanticTokens key (it's CoreTokens.text2), so outside the derived loop
    // above — kept as its own case for the reason the loop exists: it is still a
    // colour three sources declare independently.
    expect(Colors.dark.text2.toLowerCase()).toBe(CoreTokens.text2.toLowerCase());

    const cssValues = cssVarValues(css, 'content-secondary');
    expect(cssValues).toHaveLength(2);
    for (const value of cssValues) {
      expect(value).toBe(Colors.dark.text2.toLowerCase());
    }
  });

  it('InfoTokens[500] agrees with SemanticTokens.info — a fourth declaration the loop above cannot reach', () => {
    // Found while fixing the info fork above: theme_tokens.ts states "info" twice —
    // SemanticTokens.info (covered by the Object.keys loop) and InfoTokens[500] (a
    // separate export, so outside that loop's reach) — and they had drifted by one
    // hex digit (#4A9EE0 vs the corrected #499EE0), both consumed live
    // (transactions/screens/transactions/index.tsx:48,
    // transactions/detail/detail.helpers.ts:66,:172).
    expect(InfoTokens[500].toLowerCase()).toBe(SemanticTokens.info.toLowerCase());
  });

  it('warningBg is warning at 12% alpha (rgba), re-derived from Colors.dark.warning', () => {
    const [r, g, b] = hexToRgbChannels(Colors.dark.warning);
    expect(Colors.dark.warningBg).toBe(`rgba(${r}, ${g}, ${b}, 0.12)`);
  });

  it('goldTint is cairoGold at the eye-tuned dark-bg alpha (#253)', () => {
    expect(Colors.dark.goldTint).toBe(`${Colors.shared.cairoGold}22`);
  });
});
