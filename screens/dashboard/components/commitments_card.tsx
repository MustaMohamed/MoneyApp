import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { formatMonthYear } from '@/utils/format_date';

interface Props {
  paidCount: number;
  totalCount: number;
  overdueCount: number;
  totalCommitted: number;
  currency: string;
  onPress: () => void;
}

export function CommitmentsCard({
  paidCount,
  totalCount,
  overdueCount,
  totalCommitted,
  currency,
  onPress,
}: Props) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = formatMonthYear(currentMonth);

  const progress = totalCount === 0 ? 0 : paidCount / totalCount;

  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'decimal' }).format(
    totalCommitted,
  );

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{Strings.dashboardCommitmentsTitle}</Text>
        <Text style={styles.month}>{monthLabel}</Text>
      </View>

      <Text style={styles.paidText}>{Strings.dashboardCommitmentsPaid(paidCount, totalCount)}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.totalText}>
          {formattedAmount} {currency}
        </Text>
        {overdueCount > 0 && (
          <View style={styles.overdueBadge}>
            <Text style={styles.overdueText}>
              {Strings.dashboardCommitmentsOverdue(overdueCount)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  month: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  paidText: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    marginBottom: Spacing.xs,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.dark.surfaceEl,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    backgroundColor: Colors.shared.cairoGold,
    borderRadius: Radius.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  overdueBadge: {
    backgroundColor: Colors.dark.negative,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  overdueText: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
});
