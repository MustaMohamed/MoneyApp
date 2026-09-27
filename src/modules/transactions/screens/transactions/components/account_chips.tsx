import React from 'react';
import { ScrollView } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
import { Size, Spacing, TouchSize } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import type { AccountChipModel } from '../transactions.helpers';

/** Frame A1: 6 between chips, 10 above the row, 8 below. */
const CHIP_GAP = ms(6);
const ROW_PADDING_TOP = ms(10);
const ROW_PADDING_BOTTOM = Spacing.xs;

/** Lifts the 30-high chip to the 44 touch floor without reaching into a neighbour's half of the gap. */
const CHIP_HIT_SLOP = Object.freeze({
  top: (TouchSize.min - Size.compactChipHeight) / 2,
  bottom: (TouchSize.min - Size.compactChipHeight) / 2,
  left: CHIP_GAP / 2,
  right: CHIP_GAP / 2,
});

const CHIP_STYLE = Object.freeze({ minHeight: Size.compactChipHeight });

interface Props {
  chips: readonly AccountChipModel[];
  onToggle: (accountId: string | undefined) => void;
}

export function AccountChips({ chips, onToggle }: Props): React.ReactElement {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      testID="transactions-account-chips"
      contentContainerStyle={{
        paddingHorizontal: Spacing.md,
        paddingTop: ROW_PADDING_TOP,
        paddingBottom: ROW_PADDING_BOTTOM,
        columnGap: CHIP_GAP,
        alignItems: 'center',
      }}
    >
      {chips.map((chip) => (
        <SelectablePill
          key={chip.accountId ?? 'all'}
          label={chip.label}
          dotColor={chip.dotColor}
          selected={chip.selected}
          onPress={() => onToggle(chip.accountId)}
          style={CHIP_STYLE}
          hitSlop={CHIP_HIT_SLOP}
        />
      ))}
    </ScrollView>
  );
}
