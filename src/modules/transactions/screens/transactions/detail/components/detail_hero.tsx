import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View } from 'react-native';

import { HeroShell } from '@/components/ui/hero_shell';
import { Text } from '@/components/ui/text';
import { TypeBadge } from '@/components/ui/type_badge';
import { Size, Type, withAlpha } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { toIconName } from '@/utils/icon_name_guard';

import { DETAIL_HERO_MIN_HEIGHT } from './detail_geometry';

interface Props {
  tx: Transaction;
  category?: Category;
  amountText: string;
  title: string;
  dateTimeText: string;
  badgeLabel: string;
  heroColor: string;
}

export function DetailHero({
  tx,
  category,
  amountText,
  title,
  dateTimeText,
  badgeLabel,
  heroColor,
}: Props): React.ReactElement {
  const categoryColor = category?.color ?? CoreTokens.text2;

  return (
    <HeroShell glowColor={heroColor}>
      <View
        testID="transaction-detail-hero"
        className="items-center px-4 py-4"
        style={{ minHeight: DETAIL_HERO_MIN_HEIGHT, justifyContent: 'center' }}
      >
        <View className="mb-3 flex-row gap-2">
          <View
            className="rounded-full border px-2.5 py-0.5"
            style={{
              borderColor: withAlpha(heroColor, '55'),
              backgroundColor: withAlpha(heroColor, '1A'),
            }}
          >
            <Text
              className="font-inter-semibold"
              style={{ color: heroColor, fontSize: Type.overline }}
            >
              {badgeLabel}
            </Text>
          </View>
          {tx.commitment_payment_id != null ? <TypeBadge type="commitment" size="md" /> : null}
        </View>
        <Text
          className="font-sora-extrabold leading-none"
          style={{ color: heroColor, fontSize: Type.detailHero }}
        >
          {amountText}
        </Text>
        {category ? (
          <View
            className="mt-4 flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              backgroundColor: withAlpha(categoryColor, '1F'),
              borderWidth: 1,
              borderColor: withAlpha(categoryColor, '40'),
            }}
          >
            <MaterialCommunityIcons
              name={toIconName(category.icon, 'shape-outline')}
              size={Size.filterSegmentIcon}
              color={categoryColor}
            />
            <Text
              className="font-inter-semibold"
              style={{ color: categoryColor, fontSize: Type.micro }}
            >
              {category.name}
            </Text>
          </View>
        ) : null}
        <Text
          className="font-inter-medium text-foreground/70 mt-2 text-center"
          style={{ fontSize: Type.bodyStrong }}
        >
          {title}
        </Text>
        <Text className="font-inter text-foreground/55 mt-2" style={{ fontSize: Type.micro }}>
          {dateTimeText}
        </Text>
      </View>
    </HeroShell>
  );
}
