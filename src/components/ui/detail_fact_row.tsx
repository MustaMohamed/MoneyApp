import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip } from 'heroui-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { AccountColorTile } from '@/components/ui/account_color_tile';
import type { DetailFact, DetailFactLeading } from '@/components/ui/detail_fact_row.helpers';
import { FactRow } from '@/components/ui/fact_row';
import { FACT_ROW_BADGE_FONT_SIZE, FACT_ROW_TILE } from '@/components/ui/fact_row.geometry';
import { resolveOneLineTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size } from '@/constants/theme';

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

function FactLeading({ leading }: { leading: DetailFactLeading }): React.ReactElement {
  switch (leading.kind) {
    case 'tile':
      return <AccountColorTile {...leading.tile} size={FACT_ROW_TILE} glyphSize={Size.iconMicro} />;
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

/** Canvas `.fact` on the shared row: an amount's label gives way first, the Rate row holds its label and fits its value. */
export function DetailFactRow({ fact, showDivider = true }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const chip = fact.badge ? BADGE_CHIPS[fact.badge.tone] : undefined;
  return (
    <FactRow
      label={fact.label}
      value={fact.value}
      valueFace={fact.valueFace}
      fitsValue={fact.fitsValue}
      holdsAmount={fact.kind === 'amount'}
      showDivider={showDivider}
      leading={fact.leading ? <FactLeading leading={fact.leading} /> : undefined}
      trailing={
        fact.badge && chip ? (
          <Chip
            size="sm"
            variant={chip.variant}
            color={chip.color}
            className={chip.className}
            style={{ flexShrink: 0 }}
            pointerEvents="none"
          >
            <Chip.Label
              {...resolveOneLineTextProps(scaledTextStyle(FACT_ROW_BADGE_FONT_SIZE, fontScale))}
              className={chip.labelClassName}
            >
              {fact.badge.label}
            </Chip.Label>
          </Chip>
        ) : undefined
      }
    />
  );
}
