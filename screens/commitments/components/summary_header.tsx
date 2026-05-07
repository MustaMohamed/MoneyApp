import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { Strings } from '@/constants/strings';

interface SummaryHeaderProps {
  paidCount: number;
  totalCount: number;
  totalCommitted: number;
  currency: string;
}

export function SummaryHeader({
  paidCount,
  totalCount,
  totalCommitted,
  currency,
}: SummaryHeaderProps) {
  const progress = totalCount > 0 ? paidCount / totalCount : 0;
  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'decimal' }).format(
    totalCommitted,
  );
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>{Strings.commitmentsPaidSummary}</Text>
          <Text style={styles.value}>
            {paidCount} / {totalCount}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.label}>{Strings.commitmentsTotalCommitted}</Text>
          <Text style={styles.value}>
            {formattedAmount} {currency}
          </Text>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  right: { alignItems: 'flex-end' },
  label: { fontFamily: FontFamily.interRegular, fontSize: Type.caption, color: Colors.dark.text2 },
  value: { fontFamily: FontFamily.soraSemi, fontSize: Type.subhead, color: Colors.dark.text1 },
  track: {
    height: ms(4),
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: ms(2),
    overflow: 'hidden',
  },
  fill: {
    height: ms(4),
    backgroundColor: Colors.shared.cairoGold,
    borderRadius: ms(2),
  },
});
