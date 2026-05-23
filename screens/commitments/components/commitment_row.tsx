import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Category } from '@/database/entities/category.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { formatShortDate } from '@/utils/format_date';
import { toIconName } from '@/utils/icon_name_guard';

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

interface CommitmentRowProps {
  payment: CommitmentPayment;
  commitment: Commitment | undefined;
  category: Category | undefined;
  onPress: () => void;
}

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

export function CommitmentRow({ payment, commitment, category, onPress }: CommitmentRowProps) {
  const statusColor = STATUS_COLORS[payment.status];
  const statusLabel = STATUS_LABELS[payment.status];
  const isVariable = commitment?.amount_type === AmountType.Variable;
  const isPaid = payment.status === CommitmentPaymentStatus.Paid;
  const amount = isPaid
    ? (payment.amount_paid ?? payment.amount_due ?? commitment?.amount)
    : (payment.amount_due ?? commitment?.amount);
  const formattedAmount = amount != null ? numberFmt.format(amount) : '—';
  const showTilde = isVariable && !isPaid;
  const iconBg = category?.color ? `${category.color}2E` : CoreTokens.surfaceEl;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${commitment?.name ?? ''}, ${showTilde ? '~' : ''}${formattedAmount} ${payment.currency}, ${statusLabel}`}
      style={{ flexDirection: 'row', alignItems: 'center' }}
      className="border-separator min-h-[48px] gap-2 border-b px-4 py-2"
    >
      <View
        style={{ backgroundColor: iconBg, width: 36, height: 36 }}
        className="items-center justify-center rounded-md"
      >
        <MaterialCommunityIcons
          name={toIconName(category?.icon, 'tag-outline')}
          size={18}
          color={category?.color ?? CoreTokens.text2}
        />
      </View>
      <Box style={{ flex: 1 }}>
        <Text className="font-inter text-foreground text-[15px] font-medium" numberOfLines={1}>
          {commitment?.name ?? '—'}
        </Text>
        <Text className="font-inter text-muted mt-0.5 text-[11px]" numberOfLines={1}>
          {formatShortDate(payment.due_date)}
        </Text>
      </Box>
      <View style={{ alignItems: 'flex-end' }} className="gap-1">
        <Text className="font-sora text-foreground text-[15px] font-bold">
          {showTilde ? '~' : ''}
          {formattedAmount} {payment.currency}
        </Text>
        <View
          style={{
            backgroundColor: `${statusColor}22`,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          className="gap-0.5 rounded-full px-1.5 py-0.5"
        >
          <MaterialCommunityIcons
            name={STATUS_ICONS[payment.status]}
            size={11}
            color={statusColor}
          />
          <Text className="font-inter text-[10px]" style={{ color: statusColor }}>
            {statusLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
