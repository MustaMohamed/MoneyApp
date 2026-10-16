import { Chip, ListGroup } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { resolveOneLineTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';

import {
  DETAIL_FACT_BADGE_FONT_SIZE,
  DETAIL_FACT_FONT_SIZE,
  DETAIL_FACT_ROW_PADDING,
  DETAIL_FACT_VALUE_GAP,
  resolveDetailFactRowHeight,
} from './detail.geometry';

export interface DetailFactBadge {
  label: string;
  tone: 'accent' | 'neutral';
}

interface Props {
  label: string;
  value?: string;
  leading?: React.ReactNode;
  badge?: DetailFactBadge;
  valueFace?: 'sora' | 'inter';
  showDivider?: boolean;
}

// Canvas `.tb`: accent is the soft accent chip; neutral is secondary text on a separator border with no fill.
const BADGE_CHIPS = {
  accent: {
    variant: 'soft',
    color: 'accent',
    className: 'self-center',
    labelClassName: 'font-inter-semibold text-accent',
  },
  neutral: {
    variant: 'tertiary',
    color: 'default',
    className: 'border-separator self-center border',
    labelClassName: 'font-inter-semibold text-content-secondary',
  },
} as const;

const VALUE_CLASS_NAMES = {
  sora: 'font-sora text-foreground tabular-nums',
  inter: 'font-inter text-foreground',
} as const;

/** Canvas `.fact`: the label left and held whole, the value right and shrinking first, one line each. */
export function DetailFactRow({
  label,
  value,
  leading,
  badge,
  valueFace = 'sora',
  showDivider = true,
}: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const text = resolveOneLineTextProps(scaledTextStyle(DETAIL_FACT_FONT_SIZE, fontScale));
  const chip = badge ? BADGE_CHIPS[badge.tone] : undefined;
  return (
    <ListGroup.Item
      className={`flex-row items-center justify-between gap-3 px-4 py-0 ${showDivider ? 'border-separator border-b' : ''}`}
      style={{
        height: resolveDetailFactRowHeight(fontScale),
        paddingVertical: DETAIL_FACT_ROW_PADDING,
      }}
    >
      <ListGroup.ItemDescription
        {...text}
        className="font-inter text-content-secondary"
        style={[text.style, { flexShrink: 0 }]}
      >
        {label}
      </ListGroup.ItemDescription>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexShrink: 1,
          gap: DETAIL_FACT_VALUE_GAP,
        }}
      >
        {leading}
        {value === undefined ? null : (
          <ListGroup.ItemTitle {...text} className={VALUE_CLASS_NAMES[valueFace]}>
            {value}
          </ListGroup.ItemTitle>
        )}
        {badge && chip ? (
          <Chip
            size="sm"
            variant={chip.variant}
            color={chip.color}
            className={chip.className}
            style={{ flexShrink: 0 }}
            pointerEvents="none"
          >
            <Chip.Label
              {...resolveOneLineTextProps(scaledTextStyle(DETAIL_FACT_BADGE_FONT_SIZE, fontScale))}
              className={chip.labelClassName}
            >
              {badge.label}
            </Chip.Label>
          </Chip>
        ) : null}
      </View>
    </ListGroup.Item>
  );
}
