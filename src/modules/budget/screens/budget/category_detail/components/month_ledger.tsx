import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { FITTED_LINE_SLACK, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type, lineHeightFor } from '@/constants/theme';
import type { MonthResultVM } from '@/modules/budget/screens/budget/budget.helpers';
import { resolveLedgerMonthColumnWidth } from '@/modules/budget/screens/budget/budget_text.geometry';
import {
  MINUS_SIGN,
  PLUS_SIGN,
  formatAmount,
  formatDisplayMagnitude,
  signAmountText,
} from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

export function MonthLedger({ results }: { results: MonthResultVM[] }) {
  // `results` arrives oldest first, so the ledger renders newest first.
  const ordered = [...results].reverse();
  const { fontScale } = useWindowDimensions();
  // One device pixel past the gap: the two boxes round to whole pixels and read under 8 dp without it.
  const descriptionStyle =
    fontScale > 1 ? { marginRight: Spacing.xs + FITTED_LINE_SLACK } : undefined;
  const monthStyle = {
    width: resolveLedgerMonthColumnWidth(fontScale),
    ...scaledTextStyle(Type.body, fontScale),
  };
  return (
    <View>
      {ordered.map((r) => {
        const positive = r.delta >= 0;
        // `computeCategoryHistory` snaps `r.delta` under half a cent to 0, which prints unsigned (#332).
        const deltaMag = formatDisplayMagnitude(r.delta, Currency.EGP);
        return (
          <View key={r.yearMonth} style={styles.row}>
            <Text style={[styles.mo, monthStyle]} numberOfLines={1} allowFontScaling={false}>
              {label(r.yearMonth, r.isProvisional)}
            </Text>
            <Text
              style={[styles.det, descriptionStyle]}
            >{`${Strings.budgetDetailPartOf(formatAmount(r.spent), formatAmount(r.limit))}${r.isProvisional ? Strings.budgetDetailSoFarSuffix : ''}`}</Text>
            <View style={[styles.delta, positive ? styles.deltaPos : styles.deltaNeg]}>
              <Text
                style={[styles.deltaText, positive ? styles.deltaTextPos : styles.deltaTextNeg]}
              >
                {signAmountText(
                  deltaMag.text,
                  positive ? PLUS_SIGN : MINUS_SIGN,
                  deltaMag.printsAsZero,
                )}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function label(ym: string, provisional: boolean): string {
  const m = Number(ym.split('-')[1]);
  const abbr =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] ??
    ym;
  return provisional ? `${abbr}*` : abbr;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
  },
  mo: { fontFamily: FontFamily.interSemi, color: Colors.dark.text1 },
  det: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    lineHeight: lineHeightFor(Type.micro),
    color: Colors.dark.text2,
  },
  delta: { paddingHorizontal: ms(9), paddingVertical: ms(2), borderRadius: Radius.sm },
  deltaPos: { backgroundColor: 'rgba(76,175,130,0.13)' },
  deltaNeg: { backgroundColor: 'rgba(224,90,66,0.13)' },
  deltaText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.caption,
    lineHeight: lineHeightFor(Type.caption),
  },
  deltaTextPos: { color: Colors.dark.positive },
  deltaTextNeg: { color: Colors.dark.negative },
});
