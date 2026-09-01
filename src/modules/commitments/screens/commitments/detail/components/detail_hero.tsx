import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { HeroShell } from '@/components/ui/hero_shell';
import { Text } from '@/components/ui/text';
import { AmountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, withAlpha } from '@/constants/theme';
import type { Category } from '@/database/entities/category.entity';
import { toIconName } from '@/utils/icon_name_guard';

import type { Commitment } from '../../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../../entities/commitment_payment.entity';
import { formatCommitmentAmount } from '../../commitment_status';
import { heroEntering } from '../detail.anim';

interface Props {
  commitment: Commitment;
  category: Category | undefined;
  payment: CommitmentPayment | undefined;
  recurrenceLabel: string;
}

export function DetailHero({ commitment, category, payment, recurrenceLabel }: Props) {
  const iconColor = category?.color ?? Colors.dark.gold;
  const tintBg = iconColor.length === 7 ? withAlpha(iconColor, '2E') : iconColor;
  const currency = payment?.currency ?? commitment.currency;
  const amountText =
    formatCommitmentAmount(payment, commitment) ??
    (commitment.amount_type === AmountType.Variable ? Strings.commitmentsAmountVariable : currency);

  return (
    <HeroShell entering={heroEntering} glowColor={iconColor} glowOpacity={0.25}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center' }}>
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
          className="font-sora-extrabold text-foreground mb-1 text-center text-[28px]"
          numberOfLines={1}
        >
          {commitment.name}
        </Text>
        <Text
          className="font-inter-semibold text-[16px]"
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
      </View>
    </HeroShell>
  );
}
