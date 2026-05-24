import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { formatMonthYear } from '@/utils/format_date';

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
    <View
      style={{ flexDirection: 'row', alignItems: 'center' }}
      className={`gap-2 py-2 ${showDivider ? 'border-separator border-b' : ''}`}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
      <View style={{ flex: 1 }}>
        <Text className="font-inter text-foreground text-[15px] font-medium">
          {formatMonthYear(payment.due_date)}
        </Text>
        <Text className="font-inter mt-0.5 text-[12px]" style={{ color: statusColor }}>
          {statusLabel}
        </Text>
      </View>
      <Text className="font-sora text-foreground text-[15px] font-semibold">{amountText}</Text>
    </View>
  );
}
