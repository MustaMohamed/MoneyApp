import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/database/entities/category.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { ms, msFont } from '@/utils/responsive';
import { heroEntering } from '../detail.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

interface Props {
  commitment: Commitment;
  category: Category | undefined;
  payment: CommitmentPayment | undefined;
  recurrenceLabel: string;
}

function GridTexture() {
  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="cmt-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <Path d="M 26 0 L 0 0 0 26" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.02" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#cmt-grid)" />
    </Svg>
  );
}

export function DetailHero({ commitment, category, payment, recurrenceLabel }: Props) {
  const iconColor = category?.color ?? Colors.dark.gold;
  const tintBg = iconColor.length === 7 ? `${iconColor}2E` : iconColor;
  const isVariable = commitment.amount_type === AmountType.Variable;
  const isPaid = payment?.status === CommitmentPaymentStatus.Paid;
  const amount = isPaid
    ? (payment?.amount_paid ?? payment?.amount_due ?? commitment.amount)
    : (payment?.amount_due ?? commitment.amount);
  const showTilde = isVariable && !isPaid;
  const currency = payment?.currency ?? commitment.currency;
  const amountText =
    amount != null
      ? `${showTilde ? '~' : ''}${currency} ${numberFmt.format(amount)}`
      : isVariable
        ? Strings.commitmentsAmountVariable
        : currency;

  return (
    <Animated.View entering={heroEntering} style={styles.wrap}>
      <LinearGradient
        colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GridTexture />
      <View
        pointerEvents="none"
        style={[styles.glow, { backgroundColor: iconColor, opacity: 0.25 }]}
      />
      <View style={[styles.iconBox, { backgroundColor: tintBg }]}>
        <MaterialCommunityIcons
          name={(category?.icon ?? 'tag-outline') as IconName}
          size={ms(28)}
          color={iconColor}
        />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {commitment.name}
      </Text>
      <Text style={[styles.amount, { color: iconColor }]} numberOfLines={1}>
        {amountText}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {category?.name ?? ''}
        {category?.name && recurrenceLabel ? ' · ' : ''}
        {recurrenceLabel}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -ms(40),
    right: -ms(40),
    width: ms(160),
    height: ms(160),
    borderRadius: ms(80),
  },
  iconBox: {
    width: ms(56),
    height: ms(56),
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  name: {
    fontFamily: FontFamily.soraExtra,
    fontSize: msFont(28),
    color: Colors.dark.text1,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  amount: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(16),
    opacity: 0.85,
  },
  meta: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(12),
    color: Colors.dark.text1,
    opacity: 0.35,
    marginTop: ms(4),
  },
});
