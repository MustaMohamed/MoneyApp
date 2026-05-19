import { StyleSheet, Text, View } from 'react-native';

import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { formatMonthYear } from '@/utils/format_date';
import { ms, msFont } from '@/utils/responsive';

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

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

interface Props {
  payment: CommitmentPayment;
  commitment: Commitment;
  showDivider?: boolean;
}

export function PaymentRow({ payment, commitment, showDivider = true }: Props) {
  const statusColor = STATUS_COLORS[payment.status];
  const statusLabel = STATUS_LABELS[payment.status];
  const displayAmount = payment.amount_paid ?? payment.amount_due ?? commitment.amount;
  const amountText =
    displayAmount != null ? `${numberFmt.format(displayAmount)} ${payment.currency}` : '—';

  return (
    <View style={[styles.row, !showDivider && styles.noDivider]}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <View style={styles.info}>
        <Text style={styles.monthLabel}>{formatMonthYear(payment.due_date)}</Text>
        <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
      </View>
      <Text style={styles.amount}>{amountText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  noDivider: { borderBottomWidth: 0 },
  dot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  info: { flex: 1 },
  monthLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  statusLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(12),
    marginTop: ms(2),
  },
  amount: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
});
