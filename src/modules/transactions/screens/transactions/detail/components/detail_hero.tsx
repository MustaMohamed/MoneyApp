import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View } from 'react-native';

import { HeroShell } from '@/components/ui/hero_shell';
import { Text } from '@/components/ui/text';
import { TypeBadge } from '@/components/ui/type_badge';
import type { Category } from '@/database/entities/category.entity';
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
              borderColor: `${heroColor}55`,
              backgroundColor: `${heroColor}1A`,
            }}
          >
            <Text className="font-inter text-[10.5px] font-semibold" style={{ color: heroColor }}>
              {badgeLabel}
            </Text>
          </View>
          {tx.commitment_payment_id != null ? <TypeBadge type="commitment" size="md" /> : null}
        </View>
        <Text
          className="font-sora text-[30px] leading-none font-extrabold"
          style={{ color: heroColor }}
        >
          {amountText}
        </Text>
        {category ? (
          <View
            className="mt-4 flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              // oxlint-disable-next-line typescript/no-unnecessary-condition -- DB color can be null despite type
              backgroundColor: `${category.color ?? '#888'}1F`,
              borderWidth: 1,
              // oxlint-disable-next-line typescript/no-unnecessary-condition -- DB color can be null despite type
              borderColor: `${category.color ?? '#888'}40`,
            }}
          >
            <MaterialCommunityIcons
              // oxlint-disable-next-line typescript/no-unnecessary-condition -- DB can return null icon despite entity type
              name={toIconName(category.icon, 'shape-outline')}
              size={14}
              // oxlint-disable-next-line typescript/no-unnecessary-condition -- DB color can be null despite type
              color={category.color ?? '#888'}
            />
            <Text
              className="font-inter text-[11px] font-semibold"
              // oxlint-disable-next-line typescript/no-unnecessary-condition -- DB color can be null despite type
              style={{ color: category.color ?? '#888' }}
            >
              {category.name}
            </Text>
          </View>
        ) : null}
        <Text className="font-inter text-foreground/70 mt-2 text-center text-[15px] font-medium">
          {title}
        </Text>
        <Text className="font-inter text-foreground/55 mt-2 text-[11px]">{dateTimeText}</Text>
      </View>
    </HeroShell>
  );
}
