import { Label, Typography } from 'heroui-native';
import React from 'react';

import { Spacing, Type, lineHeightFor } from '@/constants/theme';

export interface FormLabelTextProps {
  label: string;
  /** Right-aligned tag rendered on the same row as the label. */
  tag?: string;
  numberOfLines?: number;
}

// `style` overrides only the properties it sets, so pair every `fontSize` with a `lineHeight`.
export function FormLabelText({ label, tag, numberOfLines }: FormLabelTextProps) {
  return (
    <Label style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.xs }}>
      <Label.Text
        className="font-inter-semibold"
        style={{ fontSize: Type.detail, lineHeight: lineHeightFor(Type.detail), flexShrink: 1 }}
        numberOfLines={numberOfLines}
      >
        {label}
      </Label.Text>
      {tag ? (
        <Typography
          className="font-inter text-content-secondary"
          style={{ fontSize: Type.detail, lineHeight: lineHeightFor(Type.detail) }}
        >
          {tag}
        </Typography>
      ) : null}
    </Label>
  );
}
