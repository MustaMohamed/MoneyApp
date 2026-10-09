import { Label, Typography } from 'heroui-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { resolveFormLabelReserve } from '@/components/ui/form_label_text.geometry';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

export interface FormLabelTextProps {
  label: string;
  /** Right-aligned tag rendered on the same row as the label. */
  tag?: string;
  /** Lines the label may take and its row reserves, at an app-scaled size, so a shorter label sits on the field. */
  reserveLines?: 1 | 2;
}

/** `style` overrides only the properties it sets, so pair every `fontSize` with a `lineHeight`. */
export function FormLabelText({ label, tag, reserveLines }: FormLabelTextProps) {
  const reserved = resolveFormLabelReserve(reserveLines, useWindowDimensions().fontScale);
  return (
    // accessible={false}: a do-nothing Pressable row must not announce as tappable — the field carries its own accessibilityLabel.
    <Label
      accessible={false}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.xs,
        ...(reserved ? { minHeight: reserved.minHeight, alignItems: 'flex-end' } : undefined),
      }}
    >
      <Label.Text
        className="font-inter-semibold"
        allowFontScaling={reserved === undefined}
        style={{
          fontSize: Type.detail,
          lineHeight: lineHeightFor(Type.detail),
          flexShrink: 1,
          ...reserved?.text,
        }}
        numberOfLines={reserveLines}
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
