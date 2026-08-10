import { Label, Typography } from 'heroui-native';
import React from 'react';

import { Spacing, Type } from '@/constants/theme';

export interface FormLabelTextProps {
  label: string;
  /** Right-aligned "optional" tag on the same row (mockup § C5's `.fld-l .tag`). */
  tag?: string;
  numberOfLines?: number;
}

/**
 * The redesigned account form's field label row (mockup § C, `.fld-l`) —
 * label text left, an optional tag right, sharing one row via `style`
 * (RN flex layout, never className — .claude/rules/ui.md). Repurposed from
 * a dead component (zero consumers on main, MA-009 plan step 6) rather than
 * added beside it.
 *
 * Colour deliberately does NOT follow the mockup's `.fld-l` (`--content-
 * secondary`, 4.33:1 — under the AA floor). spec.md:122 binds every task in
 * this scope: "anything a user must read is full-strength". Leaving HeroUI
 * `Label.Text`'s own default (`--color-foreground`) achieves that with no
 * override; only size and weight follow the mockup. The `tag` stays
 * `--content-secondary` — decision 8: it is genuinely redundant, since the
 * field itself already shows whether it is required.
 *
 * Both overrides pair `fontSize` with an explicit `lineHeight`: HeroUI
 * `Label.Text`/`Typography` keep their className's own line-height
 * (`.label__text`'s `--text-base--line-height`, `Typography`'s fixed 28pt
 * `--spacing`-derived one) unless `style` states a replacement — `style`
 * only wins on the properties it sets. Left unpaired, a label row *with* a
 * tag renders taller than one without, since the row is `flexDirection:
 * 'row'` and its height is the max of its two children (impl review round
 * 1, D3 — measured 11px taller in C5's two-column row, offsetting the row's
 * two inputs).
 */
export function FormLabelText({ label, tag, numberOfLines }: FormLabelTextProps) {
  return (
    <Label style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.xs }}>
      <Label.Text
        className="font-inter-semibold"
        style={{ fontSize: Type.detail, lineHeight: Math.round(Type.detail * 1.3), flexShrink: 1 }}
        numberOfLines={numberOfLines}
      >
        {label}
      </Label.Text>
      {tag ? (
        <Typography
          className="font-inter text-content-secondary"
          style={{ fontSize: Type.detail, lineHeight: Math.round(Type.detail * 1.3) }}
        >
          {tag}
        </Typography>
      ) : null}
    </Label>
  );
}
