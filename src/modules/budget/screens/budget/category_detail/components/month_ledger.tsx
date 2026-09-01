import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { MonthResultVM } from '@/modules/budget/screens/budget/budget.helpers';
import { MINUS_SIGN, PLUS_SIGN, formatAmount, signAmountText } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

export function MonthLedger({ results }: { results: MonthResultVM[] }) {
  // `results` arrives oldest first, so the ledger renders newest first.
  const ordered = [...results].reverse();
  return (
    <View>
      {ordered.map((r) => {
        const positive = r.delta >= 0;
        return (
          <View key={r.yearMonth} style={styles.row}>
            <Text style={styles.mo}>{label(r.yearMonth, r.isProvisional)}</Text>
            <Text
              style={styles.det}
            >{`${formatAmount(r.spent)} of ${formatAmount(r.limit)}${r.isProvisional ? ' · so far' : ''}`}</Text>
            <View style={[styles.delta, positive ? styles.deltaPos : styles.deltaNeg]}>
              <Text
                style={[styles.deltaText, positive ? styles.deltaTextPos : styles.deltaTextNeg]}
              >
                {signAmountText(formatAmount(Math.abs(r.delta)), positive ? PLUS_SIGN : MINUS_SIGN)}
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
  mo: {
    width: ms(54),
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  det: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  delta: { paddingHorizontal: ms(9), paddingVertical: ms(2), borderRadius: Radius.sm },
  deltaPos: { backgroundColor: 'rgba(76,175,130,0.13)' },
  deltaNeg: { backgroundColor: 'rgba(224,90,66,0.13)' },
  deltaText: { fontFamily: FontFamily.soraBold, fontSize: Type.caption },
  deltaTextPos: { color: Colors.dark.positive },
  deltaTextNeg: { color: Colors.dark.negative },
});
