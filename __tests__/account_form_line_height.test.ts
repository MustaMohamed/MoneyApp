import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { lineHeightFor } from '@/constants/theme';

describe('lineHeightFor', () => {
  it('rounds fontSize * 1.3', () => {
    expect(lineHeightFor(10)).toBe(13); // 13.0 -> 13
    expect(lineHeightFor(12)).toBe(16); // 15.6 -> 16
    expect(lineHeightFor(20)).toBe(26); // 26.0 -> 26
  });

  it('rounds half-up, matching Math.round', () => {
    // 11.5 * 1.3 = 14.95 -> 15
    expect(lineHeightFor(11.5)).toBe(15);
  });
});

/**
 * Structural regression guard for debt:quality #229 / MA-009 post-approval
 * fix F4: this defect class already fired once inside MA-009 itself (impl
 * review D3, an 11px label-row mismatch from a `fontSize` override that
 * shipped with no paired `lineHeight` at all). This scans source the same
 * way `typography_tokens.test.ts` already does for the font-class / theme
 * token chain — an invariant over source structure, not an assertion on exact
 * file content (`.claude/rules/tests.md` prunes the latter, not the
 * former: `ui.md` names `typography_tokens.test.ts` as "enforcing the whole
 * chain").
 *
 * Every `style={{ ... }}` object literal that sets `fontSize` in the files
 * below must also set `lineHeight` in the same object, and it must route
 * through `lineHeightFor` rather than a hand-written `Math.round(... * n)`
 * — the second multiplier (`* 1.35`) that drifted in beside `* 1.3` was
 * exactly this kind of hand-written duplicate.
 */
const FILES = [
  'src/components/ui/form_label_text.tsx',
  'src/modules/accounts/components/account_form/account_form.tsx',
  'src/modules/accounts/components/account_form/balance_currency_suffix.tsx',
  'src/modules/accounts/components/account_form/account_type_tile.tsx',
  'src/modules/accounts/components/account_form/credit_card_fields.tsx',
  'src/modules/accounts/components/account_form/credit_card_slot.tsx',
  'src/modules/accounts/components/account_form/field_message_rail.tsx',
];

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

/**
 * Every `style={{ ... }}` object body in the file. Non-greedy up to the
 * first `}}` — safe for this specific file set because none of their
 * `style={{ ... }}` objects nest another object literal (verified by
 * reading each file; a future nested style object would need brace-matching
 * like `typography_tokens.test.ts`'s `registeredFaces()` uses).
 */
function styleObjectBodies(src: string): string[] {
  return [...src.matchAll(/style=\{\{([\s\S]*?)\}\}/g)].map(([, body]) => body);
}

describe('fontSize / lineHeight pairing in the account-form UI (debt:quality #229)', () => {
  it('every fontSize override pairs an explicit lineHeight', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const body of styleObjectBodies(source(file))) {
        if (/\bfontSize\s*:/.test(body) && !/\blineHeight\s*:/.test(body)) {
          offenders.push(`${file}: ${body.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every paired lineHeight routes through lineHeightFor, not a hand-written ratio', () => {
    // FieldMessageRail's own text is the one documented exception: it pairs
    // Type.detail with the deliberately-unscaled FIELD_MESSAGE_TEXT_LINE_
    // HEIGHT (account_form.geometry.ts), which must NOT go through
    // lineHeightFor's ms()-scaled ratio — that would break its equality
    // with HeroUI FieldError's own unscaled line-height off scale 1.0.
    const offenders: string[] = [];
    for (const file of FILES) {
      for (const body of styleObjectBodies(source(file))) {
        if (!/\bfontSize\s*:/.test(body) || !/\blineHeight\s*:/.test(body)) continue;
        if (/\blineHeight:\s*FIELD_MESSAGE_TEXT_LINE_HEIGHT\b/.test(body)) continue;
        if (!/\blineHeight:\s*lineHeightFor\(/.test(body)) {
          offenders.push(`${file}: ${body.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
