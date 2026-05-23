import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type { Category } from '@/database/entities/category.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { toIconName } from '@/utils/icon_name_guard';

import { heroEntering } from '../detail.anim';

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
          {/* SVG stroke is not className-able — inline literal per §5/§6 exception */}
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
    ? // oxlint-disable-next-line typescript/no-unnecessary-condition -- payment may be undefined at render
      (payment?.amount_paid ?? payment?.amount_due ?? commitment.amount)
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
    <Animated.View
      entering={heroEntering}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 20,
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GridTexture />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: iconColor,
          opacity: 0.25,
        }}
      />
      <View
        style={{ backgroundColor: tintBg, width: 56, height: 56, marginBottom: 16 }}
        className="items-center justify-center rounded-xl"
      >
        <MaterialCommunityIcons
          name={toIconName(category?.icon, 'tag-outline')}
          size={28}
          color={iconColor}
        />
      </View>
      <Text
        className="font-sora text-foreground mb-1 text-center text-[28px] font-extrabold"
        numberOfLines={1}
      >
        {commitment.name}
      </Text>
      <Text
        className="font-inter text-[16px] font-semibold"
        style={{ color: iconColor, opacity: 0.85 }}
        numberOfLines={1}
      >
        {amountText}
      </Text>
      <Text
        className="font-inter text-foreground mt-1 text-[12px]"
        style={{ opacity: 0.35 }}
        numberOfLines={1}
      >
        {category?.name ?? ''}
        {category?.name && recurrenceLabel ? ' · ' : ''}
        {recurrenceLabel}
      </Text>
    </Animated.View>
  );
}
