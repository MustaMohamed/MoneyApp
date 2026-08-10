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
 */
export function FormLabelText({ label, tag, numberOfLines }: FormLabelTextProps) {
  return (
    <Label style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.xs }}>
      <Label.Text
        className="font-inter-semibold"
        style={{ fontSize: Type.detail, flexShrink: 1 }}
        numberOfLines={numberOfLines}
      >
        {label}
      </Label.Text>
      {tag ? (
        <Typography className="font-inter text-content-secondary" style={{ fontSize: Type.detail }}>
          {tag}
        </Typography>
      ) : null}
    </Label>
  );
}
