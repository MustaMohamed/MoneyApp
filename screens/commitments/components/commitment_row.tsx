import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';
import { formatShortDate } from '@/utils/format_date';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { Category } from '@/database/entities/category.entity';
import { useRowPressScale } from '../commitments.anim';

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

interface CommitmentRowProps {
  payment: CommitmentPayment;
  commitment: Commitment | undefined;
  category: Category | undefined;
  onPress: () => void;
}

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

export function CommitmentRow({ payment, commitment, category, onPress }: CommitmentRowProps) {
  const { scale, onPressIn, onPressOut } = useRowPressScale();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const statusColor = STATUS_COLORS[payment.status];
  const statusLabel = STATUS_LABELS[payment.status];
  const isVariable = commitment?.amount_type === AmountType.Variable;
  const amount = payment.amount_due ?? commitment?.amount;
  const formattedAmount = amount != null ? numberFmt.format(amount) : '—';
  const iconBg = category?.color ? `${category.color}2E` : Colors.dark.surfaceEl;

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.row, animStyle]}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons
            name={
              (category?.icon ?? 'tag-outline') as React.ComponentProps<
                typeof MaterialCommunityIcons
              >['name']
            }
            size={ms(18)}
            color={category?.color ?? Colors.dark.text2}
          />
        </View>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {commitment?.name ?? '—'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {formatShortDate(payment.due_date)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>
            {isVariable ? '~' : ''}
            {formattedAmount} {payment.currency}
          </Text>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ms(48),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    backgroundColor: Colors.dark.bg,
  },
  iconBox: {
    width: ms(36),
    height: ms(36),
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1 },
  title: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(11),
    color: Colors.dark.text2,
    marginTop: 2,
  },
  right: { alignItems: 'flex-end' },
  amount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text1,
  },
  statusText: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(10),
    marginTop: 2,
  },
});
