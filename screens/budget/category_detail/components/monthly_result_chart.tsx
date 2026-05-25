import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Type } from '@/constants/theme';
import type { MonthResultVM } from '@/screens/budget/budget.helpers';
import { ms } from '@/utils/responsive';

export function MonthlyResultChart({ results }: { results: MonthResultVM[] }) {
  const maxAbs = Math.max(1, ...results.map((r) => Math.abs(r.delta)));
  const hasProvisional = results.some((r) => r.isProvisional);
  return (
    <View>
      <View style={styles.chart}>
        {results.map((r) => {
          const h = (Math.abs(r.delta) / maxAbs) * ms(48);
          const positive = r.delta >= 0;
          const directional = positive ? Colors.dark.positive : Colors.dark.negative;
          // In-progress month: draw a HOLLOW bar so it never reads as a banked
          // result. Neutral outline while nothing has been spent yet; it only
          // takes the directional (green/red) outline once real spend lands.
          const outline = r.spent > 0 ? directional : Colors.dark.border;
          return (
            <View key={r.yearMonth} style={styles.col}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(ms(3), h),
                    alignSelf: positive ? 'flex-end' : 'flex-start',
                  },
                  r.isProvisional
                    ? { backgroundColor: 'transparent', borderWidth: ms(1.5), borderColor: outline }
                    : { backgroundColor: directional },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {results.map((r) => (
          <Text key={r.yearMonth} style={styles.label}>
            {monthAbbrev(r.yearMonth)}
            {r.isProvisional ? '*' : ''}
          </Text>
        ))}
      </View>
      {hasProvisional && <Text style={styles.legend}>{Strings.budgetDetailInProgress}</Text>}
    </View>
  );
}

function monthAbbrev(ym: string): string {
  const m = Number(ym.split('-')[1]);
  return (
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] ??
    ''
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ms(60),
    gap: ms(6),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  col: { flex: 1, height: '100%', justifyContent: 'center' },
  bar: { borderRadius: ms(3), width: '100%' },
  labels: { flexDirection: 'row', gap: ms(6), marginTop: ms(4) },
  label: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.interRegular,
    fontSize: ms(9),
    color: Colors.dark.text2,
  },
  legend: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginTop: ms(6),
  },
});
