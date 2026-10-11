import { Label, Typography } from 'heroui-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { resolveFormLabelReserve } from '@/components/ui/form_label_text.geometry';
import { resolveRowStacking } from '@/components/ui/text_scale.geometry';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

export interface FormLabelTextProps {
  label: string;
  /** Right-aligned tag rendered on the same row as the label. */
  tag?: string;
  /** Lines the label may take and its row reserves, at an app-scaled size, so a shorter label sits on the field. */
  reserveLines?: 1 | 2;
  /** Reserves the line a tag takes under its label above font scale 1, for a label whose row neighbour carries a tag. */
  reserveTagLine?: boolean;
}

const ROW_STYLE = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: Spacing.xs,
} as const;
const TAG_UNDER_STYLE = {
  flexDirection: 'column',
  justifyContent: 'flex-end',
  alignItems: 'flex-start',
  gap: 0,
} as const;

/** `style` overrides only the properties it sets, so pair every `fontSize` with a `lineHeight`. */
export function FormLabelText({ label, tag, reserveLines, reserveTagLine }: FormLabelTextProps) {
  const { fontScale } = useWindowDimensions();
  const reserved = resolveFormLabelReserve(
    reserveLines,
    fontScale,
    tag !== undefined || reserveTagLine === true,
  );
  const tagUnder = tag !== undefined && resolveRowStacking(fontScale) === 'stacked';
  return (
    // accessible={false}: a do-nothing Pressable row must not announce as tappable — the field carries its own accessibilityLabel.
    <Label
      accessible={false}
      style={
        tagUnder
          ? { ...TAG_UNDER_STYLE, minHeight: reserved?.minHeight }
          : {
              ...ROW_STYLE,
              ...(reserved ? { minHeight: reserved.minHeight, alignItems: 'flex-end' } : undefined),
            }
      }
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
          allowFontScaling={reserved === undefined}
          style={{
            fontSize: Type.detail,
            lineHeight: lineHeightFor(Type.detail),
            ...reserved?.text,
          }}
        >
          {tag}
        </Typography>
      ) : null}
    </Label>
  );
}
