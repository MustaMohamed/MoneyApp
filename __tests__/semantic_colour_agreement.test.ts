import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Colors } from '@/constants/theme';
import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';

/**
 * Cross-source agreement pin for #264: `theme.ts` (`Colors.dark`), `theme_tokens.ts`
 * (`SemanticTokens`/`CoreTokens`), and `global.css` (`--warning`/`--danger`/`--success`/
 * `--content-secondary`) each state these four colours independently, and nothing
 * before this test caught them drifting apart — the `warning` fork (`theme.ts`'s
 * `#D4830A` vs everywhere else's `#E8B130`) shipped a live dashboard-vs-detail
 * mismatch. Same `readFileSync` + regex approach as `typography_tokens.test.ts`, the
 * precedent for reading `global.css` from a logic-only `.ts` suite: tests.md's M35
 * ban is on asserting component source text, not on reading a file with no
 * importable runtime surface — `readFileSync` is the only way to read it at all.
 */

function globalCss(): string {
  return readFileSync(resolve(process.cwd(), 'global.css'), 'utf8');
}

/** Every value assigned to `--name:` in global.css, lowercased for case-insensitive compare. */
function cssVarValues(css: string, name: string): string[] {
  const pattern = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`, 'g');
  return [...css.matchAll(pattern)].map(([, hex]) => hex!.toLowerCase());
}

describe('semantic colour agreement — theme.ts vs theme_tokens.ts vs global.css', () => {
  const css = globalCss();

  const cases: Array<{ name: string; darkValue: string; tokenValue: string; cssVar: string }> = [
    {
      name: 'warning',
      darkValue: Colors.dark.warning,
      tokenValue: SemanticTokens.warning,
      cssVar: 'warning',
    },
    {
      name: 'negative',
      darkValue: Colors.dark.negative,
      tokenValue: SemanticTokens.negative,
      cssVar: 'danger',
    },
    {
      name: 'positive',
      darkValue: Colors.dark.positive,
      tokenValue: SemanticTokens.positive,
      cssVar: 'success',
    },
    {
      name: 'text2',
      darkValue: Colors.dark.text2,
      tokenValue: CoreTokens.text2,
      cssVar: 'content-secondary',
    },
  ];

  it.each(cases)(
    '$name: Colors.dark, the raw token, and global.css all agree',
    ({ darkValue, tokenValue, cssVar }) => {
      expect(darkValue.toLowerCase()).toBe(tokenValue.toLowerCase());

      // The light block deliberately duplicates the dark block's values in this file.
      const cssValues = cssVarValues(css, cssVar);
      expect(cssValues).toHaveLength(2);
      for (const value of cssValues) {
        expect(value).toBe(darkValue.toLowerCase());
      }
    },
  );

  it('warningBg is warning at 12% alpha (rgba), re-derived from the reconciled hex', () => {
    // #E8B130 -> 232, 177, 48
    expect(Colors.dark.warningBg).toBe('rgba(232, 177, 48, 0.12)');
  });
});
