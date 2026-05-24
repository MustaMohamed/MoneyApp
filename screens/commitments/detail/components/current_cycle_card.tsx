import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from 'heroui-native';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import {
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_LABELS,
  resolveDisplayAmount,
} from '@/screens/commitments/commitment_status';
import { formatShortDate } from '@/utils/format_date';

import { cardEntering } from '../detail.anim';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

interface Props {
  payment: CommitmentPayment;
  commitment: Commitment;
  onMarkAsPaid: () => void;
  onSkip: () => void;
}

export function CurrentCycleCard({ payment, commitment, onMarkAsPaid, onSkip }: Props) {
  const statusColor = STATUS_COLORS[payment.status];
  const statusLabel = STATUS_LABELS[payment.status];
  const { amount, showTilde } = resolveDisplayAmount(payment, commitment);
  const amountText =
    amount != null
      ? `${showTilde ? '~' : ''}${numberFmt.format(amount)} ${payment.currency}`
      : commitment.amount_type === AmountType.Variable
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
