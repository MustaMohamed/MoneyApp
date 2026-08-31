import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Colors } from '@/constants/theme';
import { CoreTokens, InfoTokens, SemanticTokens } from '@/constants/theme_tokens';

function globalCss(): string {
  return readFileSync(resolve(process.cwd(), 'global.css'), 'utf8');
}

/** global.css states colours as `#hex` or an `r g b` triple, so `rgb(var(--x))` can add alpha. */
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

// Partial because `info` has no `Colors.dark` key; it is checked against the other two sources.
const DARK_KEY: Partial<Record<keyof typeof SemanticTokens, keyof typeof Colors.dark>> = {
  positive: 'positive',
  negative: 'negative',
  warning: 'warning',
};

// Total, so a token added to `SemanticTokens` without an entry here is a compile error.
const CSS_VAR: Record<keyof typeof SemanticTokens, string> = {
  positive: 'success',
  negative: 'danger',
  warning: 'warning',
  info: 'info',
};

// A guard rather than a cast: `Object.keys` is typed `string[]` even over a known object.
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
    // `text2` is a `CoreTokens` key, so the derived loop above cannot reach it.
    expect(Colors.dark.text2.toLowerCase()).toBe(CoreTokens.text2.toLowerCase());

    const cssValues = cssVarValues(css, 'content-secondary');
    expect(cssValues).toHaveLength(2);
    for (const value of cssValues) {
      expect(value).toBe(Colors.dark.text2.toLowerCase());
    }
  });

  it('InfoTokens[500] agrees with SemanticTokens.info — a fourth declaration the loop above cannot reach', () => {
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
