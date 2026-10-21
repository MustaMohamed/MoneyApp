import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { STATUS_COLORS, STATUS_LABELS } from '@/modules/commitments/utils/commitment_status';
import { formatCurrencyAmount } from '@/utils/format_amount';
import { formatMonthYear } from '@/utils/format_date';

import { resolvePaymentState } from '../../../../domain/payment_state';
import type { Commitment } from '../../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../../entities/commitment_payment.entity';

interface Props {
  payment: CommitmentPayment;
  today: string;
  commitment: Commitment;
  showDivider?: boolean;
}

export function PaymentRow({ payment, today, commitment, showDivider = true }: Props) {
  const paymentState = resolvePaymentState(payment, today);
  const statusColor = STATUS_COLORS[paymentState];
  const statusLabel = STATUS_LABELS[paymentState];
  const displayAmount = payment.amount_paid ?? payment.amount_due ?? commitment.amount;
  const amountText =
    displayAmount != null ? formatCurrencyAmount(displayAmount, payment.currency) : '—';

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center' }}
      className={`gap-2 py-2 ${showDivider ? 'border-separator border-b' : ''}`}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
      <View style={{ flex: 1 }}>
        <Text className="font-inter-medium text-foreground text-[15px]">
          {formatMonthYear(payment.due_date)}
        </Text>
        <Text className="font-inter mt-0.5 text-[12px]" style={{ color: statusColor }}>
          {statusLabel}
        </Text>
      </View>
      <Text className="font-sora-semibold text-foreground text-[15px]">{amountText}</Text>
    </View>
  );
}
