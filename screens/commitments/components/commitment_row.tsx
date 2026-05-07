import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { Category } from '@/database/entities/category.entity';

const STATUS_COLORS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: Colors.dark.negative,
  [CommitmentPaymentStatus.Due]: Colors.dark.gold,
  [CommitmentPaymentStatus.Upcoming]: Colors.dark.text2,
  [CommitmentPaymentStatus.Paid]: Colors.dark.positive,
  [CommitmentPaymentStatus.Skipped]: Colors.dark.text3,
};

const STATUS_LABELS: Record<CommitmentPaymentStatus, string> = {
  [CommitmentPaymentStatus.Overdue]: 'Overdue',
  [CommitmentPaymentStatus.Due]: 'Due',
  [CommitmentPaymentStatus.Upcoming]: 'Upcoming',
  [CommitmentPaymentStatus.Paid]: 'Paid',
  [CommitmentPaymentStatus.Skipped]: 'Skipped',
};

function formatDueDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number);
  const months = [
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
  ];
  return `${months[month - 1]} ${day}`;
}

interface CommitmentRowProps {
  payment: CommitmentPayment;
  commitment: Commitment | undefined;
  category: Category | undefined;
  onPress: () => void;
}

export function CommitmentRow({ payment, commitment, category, onPress }: CommitmentRowProps) {
  const statusColor = STATUS_COLORS[payment.status];
  const statusLabel = STATUS_LABELS[payment.status];
  const isVariable = commitment?.amount_type === AmountType.Variable;
  const amount = payment.amount_due ?? commitment?.amount;
  const formattedAmount =
    amount != null ? new Intl.NumberFormat('en-US', { style: 'decimal' }).format(amount) : '—';

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View
        style={[
          styles.iconBox,
          { backgroundColor: category?.color ? `${category.color}22` : Colors.dark.surfaceEl },
        ]}
      >
        <MaterialCommunityIcons
          name={
            (category?.icon ?? 'tag-outline') as React.ComponentProps<
              typeof MaterialCommunityIcons
            >['name']
          }
          size={ms(22)}
          color={category?.color ?? Colors.dark.text2}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {commitment?.name ?? '—'}
        </Text>
        <Text style={styles.date}>{formatDueDate(payment.due_date)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>
          {isVariable ? '~' : ''}
          <Text style={styles.currency}>{payment.currency} </Text>
          {formattedAmount}
        </Text>
        <View style={[styles.badge, { backgroundColor: `${statusColor}22` }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  iconBox: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontFamily: FontFamily.interMedium, fontSize: Type.body, color: Colors.dark.text1 },
  date: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    marginTop: ms(2),
  },
  right: { alignItems: 'flex-end', gap: ms(4) },
  amount: { fontFamily: FontFamily.soraSemi, fontSize: Type.body, color: Colors.dark.text1 },
  currency: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  badge: { paddingHorizontal: ms(6), paddingVertical: ms(2), borderRadius: Radius.pill },
  badgeText: { fontFamily: FontFamily.interMedium, fontSize: Type.micro },
});
