import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { resolveFitAmountTextProps } from '@/components/ui/text_scale.geometry';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type, lineHeightFor } from '@/constants/theme';
import type { CategoryHistoryVM } from '@/modules/budget/screens/budget/budget.helpers';
import {
  MINUS_SIGN,
  PLUS_SIGN,
  formatAmount,
  formatDisplayMagnitude,
  signAmountText,
} from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

export function StatTiles({ history }: { history: CategoryHistoryVM }) {
  const net = history.netBanked;
  // `computeCategoryHistory` snaps `netBanked` under half a cent to 0; the sign is composed (#332).
  const netMag = formatDisplayMagnitude(net, Currency.EGP);
  const netLabel = signAmountText(
    netMag.text,
    net >= 0 ? PLUS_SIGN : MINUS_SIGN,
    netMag.printsAsZero,
  );
  return (
    <View style={styles.row}>
      <Tile
        value={netLabel}
        valueColor={net >= 0 ? Colors.dark.positive : Colors.dark.negative}
        label={`${Strings.budgetDetailNet} · ${Strings.budgetDetailMonthsShort(history.monthsTotal)}`}
      />
      <Tile value={formatAmount(Math.round(history.avgPerMonth))} label={Strings.budgetDetailAvg} />
      <Tile
        value={Strings.budgetDetailPartOf(history.monthsUnder, history.monthsTotal)}
        label={Strings.budgetDetailUnder}
      />
    </View>
  );
}

function Tile({ value, label, valueColor }: { value: string; label: string; valueColor?: string }) {
  const { fontScale } = useWindowDimensions();
  const valueText = resolveFitAmountTextProps(Type.subhead, fontScale);
  return (
    <View style={styles.tile}>
      <Text
        {...valueText}
        numberOfLines={fontScale > 1 ? valueText.numberOfLines : undefined}
        style={[styles.value, valueText.style, valueColor ? { color: valueColor } : undefined]}
      >
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: ms(8), marginTop: Spacing.md },
  tile: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xxs,
    alignItems: 'center',
  },
  value: { fontFamily: FontFamily.soraBold, color: Colors.dark.text1 },
  label: {
    fontFamily: FontFamily.interRegular,
    fontSize: ms(9),
    lineHeight: lineHeightFor(ms(9)),
    color: Colors.dark.text2,
    marginTop: ms(3),
  },
});
