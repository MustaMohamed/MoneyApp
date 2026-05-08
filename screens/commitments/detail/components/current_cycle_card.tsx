import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { ms, msFont } from '@/utils/responsive';
import { cardEntering } from '../detail.anim';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

const STATUS_COLORS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Colors.dark.negative,
  [CommitmentPaymentStatus.Due]: Colors.dark.gold,
  [CommitmentPaymentStatus.Upcoming]: Colors.dark.text2,
  [CommitmentPaymentStatus.Paid]: Colors.dark.positive,
  [CommitmentPaymentStatus.Skipped]: Colors.dark.text3,
};

const STATUS_LABELS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Strings.commitmentsStatusOverdue,
  [CommitmentPaymentStatus.Due]: Strings.commitmentsStatusDue,
  [CommitmentPaymentStatus.Upcoming]: Strings.commitmentsStatusUpcoming,
  [CommitmentPaymentStatus.Paid]: Strings.commitmentsStatusPaid,
  [CommitmentPaymentStatus.Skipped]: Strings.commitmentsStatusSkipped,
};

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function formatDueDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number);
  return `${MONTHS_SHORT[month - 1]} ${day}`;
}

interface Props {
  payment: CommitmentPayment;
  commitment: Commitment;
  onMarkAsPaid: () => void;
  onSkip: () => void;
}

export function CurrentCycleCard({ payment, commitment, onMarkAsPaid, onSkip }: Props) {
  const statusColor = STATUS_COLORS[payment.status];
  const statusLabel = STATUS_LABELS[payment.status];
  const isVariable = commitment.amount_type === AmountType.Variable;
  const amount = payment.amount_due ?? commitment.amount;
  const amountText =
    amount != null
      ? `${isVariable ? '~' : ''}${numberFmt.format(amount)} ${payment.currency}`
      : '—';
  const isActionable =
    payment.status !== CommitmentPaymentStatus.Paid &&
    payment.status !== CommitmentPaymentStatus.Skipped;

  return (
    <Animated.View entering={cardEntering} style={styles.wrap}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{Strings.commitmentsDetailCurrentCycle}</Text>
      </View>
      <View style={[styles.card, { borderLeftColor: statusColor }]}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.dueDateLabel}>{formatDueDate(payment.due_date)}</Text>
            <Text style={styles.amountText}>{amountText}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${statusColor}22` }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <Pressable
          style={[styles.ctaBtn, !isActionable && styles.ctaBtnDisabled]}
          onPress={onMarkAsPaid}
          disabled={!isActionable}
        >
          {isActionable ? (
            <LinearGradient
              colors={['#C9973A', '#E8B84B', '#C9973A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>{Strings.commitmentsMarkAsPaid}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.ctaGradient}>
              <Text style={[styles.ctaText, styles.ctaTextDisabled]}>
                {Strings.commitmentsMarkAsPaid}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable style={styles.skipBtn} onPress={onSkip} disabled={!isActionable} hitSlop={8}>
          <Text style={[styles.skipText, !isActionable && styles.skipTextDisabled]}>
            {Strings.commitmentsSkip}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionHeader: {
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(11),
    color: Colors.dark.text2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    borderLeftWidth: ms(3),
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: { gap: ms(4) },
  dueDateLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  amountText: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.headline,
    color: Colors.dark.text1,
  },
  badge: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontFamily: FontFamily.interMedium,
    fontSize: msFont(12),
  },
  ctaBtn: {
    borderRadius: Radius.cta,
    overflow: 'hidden',
    height: Size.ctaHeight,
  },
  ctaBtnDisabled: {
    opacity: 0.35,
  },
  ctaGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.cta,
  },
  ctaText: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
  ctaTextDisabled: {
    color: Colors.dark.text2,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  skipText: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  skipTextDisabled: {
    color: Colors.dark.text3,
  },
});
