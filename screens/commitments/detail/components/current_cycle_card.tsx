import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from 'heroui-native';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { formatShortDate } from '@/utils/format_date';

import { cardEntering } from '../detail.anim';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

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

  return (
    <Animated.View entering={cardEntering} className="mx-4 mt-4">
      <Text className="font-inter text-muted mb-1 text-[11px] tracking-wide uppercase">
        {Strings.commitmentsDetailCurrentCycle}
      </Text>
      <Card
        className="bg-surface gap-2 rounded-2xl px-3 py-3"
        style={{ borderLeftWidth: 3, borderLeftColor: statusColor }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          className="gap-2"
        >
          <View style={{ flex: 1 }}>
            <Text className="font-sora text-foreground text-[15px] font-semibold">
              {amountText}
            </Text>
            <Text className="font-inter text-muted text-[11px]">
              {formatShortDate(payment.due_date)}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: `${statusColor}22`,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            className="gap-1 rounded-full px-2 py-0.5"
          >
            <MaterialCommunityIcons
              name={STATUS_ICONS[payment.status]}
              size={12}
              color={statusColor}
            />
            <Text className="font-inter text-[11px]" style={{ color: statusColor }}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {isActionable ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }} className="mt-0.5 gap-2">
            <View style={{ flex: 1 }}>
              <Button
                variant="primary"
                label={Strings.commitmentsMarkAsPaid}
                onPress={onMarkAsPaid}
              />
            </View>
            <Button variant="ghost" label={Strings.commitmentsSkip} onPress={onSkip} />
          </View>
        ) : null}
      </Card>
    </Animated.View>
  );
}
