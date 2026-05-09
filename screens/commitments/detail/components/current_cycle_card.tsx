import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { ms, msFont } from '@/utils/responsive';
import { formatShortDate } from '@/utils/format_date';
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

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const STATUS_ICONS: Record<CommitmentPaymentStatus, IconName> = {
  [CommitmentPaymentStatus.Overdue]: 'alert-circle',
  [CommitmentPaymentStatus.Due]: 'clock-outline',
  [CommitmentPaymentStatus.Upcoming]: 'calendar-clock',
  [CommitmentPaymentStatus.Paid]: 'check-circle',
  [CommitmentPaymentStatus.Skipped]: 'minus-circle',
};

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
  const isPaid = payment.status === CommitmentPaymentStatus.Paid;
  const amount = isPaid
    ? (payment.amount_paid ?? payment.amount_due ?? commitment.amount)
    : (payment.amount_due ?? commitment.amount);
  const showTilde = isVariable && !isPaid;
  const amountText =
    amount != null
      ? `${showTilde ? '~' : ''}${numberFmt.format(amount)} ${payment.currency}`
      : isVariable
        ? Strings.commitmentsAmountVariable
        : '—';
  const isActionable =
    payment.status !== CommitmentPaymentStatus.Paid &&
    payment.status !== CommitmentPaymentStatus.Skipped;

  const statusIcon = STATUS_ICONS[payment.status];

  return (
    <Animated.View entering={cardEntering} style={styles.wrap}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{Strings.commitmentsDetailCurrentCycle}</Text>
      </View>
      <View style={[styles.card, { borderLeftColor: statusColor }]}>
        <View style={styles.headerRow}>
          <View style={styles.info}>
            <Text style={styles.amountText}>{amountText}</Text>
            <Text style={styles.dueDateLabel}>{formatShortDate(payment.due_date)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${statusColor}22` }]}>
            <MaterialCommunityIcons name={statusIcon} size={msFont(12)} color={statusColor} />
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {isActionable && (
          <View style={styles.actions}>
            <Pressable style={styles.ctaBtn} onPress={onMarkAsPaid}>
              <LinearGradient
                colors={[Colors.shared.cairoGold, Colors.dark.gold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>{Strings.commitmentsMarkAsPaid}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.skipBtn} onPress={onSkip} hitSlop={8}>
              <Text style={styles.skipText}>{Strings.commitmentsSkip}</Text>
            </Pressable>
          </View>
        )}
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  info: { gap: ms(2), flex: 1 },
  amountText: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text1,
  },
  dueDateLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(11),
    color: Colors.dark.text2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontFamily: FontFamily.interMedium,
    fontSize: msFont(11),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xxs,
  },
  ctaBtn: {
    flex: 1,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    height: ms(36),
  },
  ctaGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: FontFamily.soraSemi,
    fontSize: msFont(13),
    color: Colors.shared.midnightBlue,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    height: ms(36),
  },
  skipText: {
    fontFamily: FontFamily.interMedium,
    fontSize: msFont(13),
    color: Colors.dark.text2,
  },
});
