import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, ListGroup } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import {
  resolveFitAmountTextProps,
  resolveOneLineTextProps,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Size } from '@/constants/theme';

import type { DetailFact, DetailFactLeading } from '../detail.helpers';
import {
  DETAIL_FACT_BADGE_FONT_SIZE,
  DETAIL_FACT_FONT_SIZE,
  DETAIL_FACT_ROW_PADDING,
  DETAIL_FACT_TILE,
  DETAIL_FACT_VALUE_GAP,
  resolveDetailFactRowHeight,
} from './detail.geometry';

interface Props {
  fact: DetailFact;
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

function FactLeading({ leading }: { leading: DetailFactLeading }): React.ReactElement {
  switch (leading.kind) {
    case 'tile':
      return (
        <AccountColorTile {...leading.tile} size={DETAIL_FACT_TILE} glyphSize={Size.iconMicro} />
      );
    case 'glyph':
      return (
        <MaterialCommunityIcons
          name={leading.glyphName}
          size={Size.iconXs}
          color={leading.glyphColor}
        />
      );
    default: {
      const unhandled: never = leading;
      return unhandled;
    }
  }
}

/** Canvas `.fact`: the label left and held whole, the value right and shrinking first, one line each. */
export function DetailFactRow({ fact, showDivider = true }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const text = resolveOneLineTextProps(scaledTextStyle(DETAIL_FACT_FONT_SIZE, fontScale));
  const valueText = fact.fitsValue
    ? resolveFitAmountTextProps(DETAIL_FACT_FONT_SIZE, fontScale)
    : text;
  const chip = fact.badge ? BADGE_CHIPS[fact.badge.tone] : undefined;
  return (
    <ListGroup.Item
      // `py-0`: HeroUI's own 16 dp item padding would cut every text in a 44 dp row.
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
        {fact.label}
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
        {fact.leading ? <FactLeading leading={fact.leading} /> : null}
        {fact.value === undefined ? null : (
          <ListGroup.ItemTitle
            {...valueText}
            className={VALUE_CLASS_NAMES[fact.valueFace]}
            style={[valueText.style, { flexShrink: 1 }]}
          >
            {fact.value}
          </ListGroup.ItemTitle>
        )}
        {fact.badge && chip ? (
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
              {fact.badge.label}
            </Chip.Label>
          </Chip>
        ) : null}
      </View>
    </ListGroup.Item>
  );
}
