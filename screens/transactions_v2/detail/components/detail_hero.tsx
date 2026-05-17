import React from 'react';
import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/ui/text';
import { TypeBadge } from '@/components/ui/type_badge';
import { TransactionType } from '@/constants/enums';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';

interface Props {
  tx: Transaction;
  category?: Category;
  amountText: string;
  title: string;
  dateTimeText: string;
}

function typeColor(type: TransactionType): string {
  switch (type) {
    case TransactionType.Income: return '#6EE7B7';
    case TransactionType.Transfer: return '#D4AF37';
    case TransactionType.CCPayment: return '#D699E8';
    default: return '#F0EEE6';
  }
}

function typeLabel(type: TransactionType): string {
  switch (type) {
    case TransactionType.Income: return 'Income';
    case TransactionType.Transfer: return 'Transfer';
    case TransactionType.CCPayment: return 'CC Payment';
    default: return 'Expense';
  }
}

export function DetailHero({ tx, category, amountText, title, dateTimeText }: Props): React.ReactElement {
  return (
    <View className="px-4 pt-6 pb-4 items-center">
      <View className="flex-row gap-2 mb-3">
        <View className="px-2.5 py-0.5 rounded-full border" style={{ borderColor: `${typeColor(tx.type)}55`, backgroundColor: `${typeColor(tx.type)}1A` }}>
          <Text className="font-inter font-semibold text-[10.5px]" style={{ color: typeColor(tx.type) }}>
            {typeLabel(tx.type)}
          </Text>
        </View>
        {tx.commitment_payment_id != null ? <TypeBadge type="commitment" size="md" /> : null}
      </View>
      <Text className="font-sora font-extrabold text-[36px] leading-none" style={{ color: typeColor(tx.type), letterSpacing: -0.5 }}>
        {amountText}
      </Text>
      {category ? (
        <View className="flex-row items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full" style={{ backgroundColor: `${category.color ?? '#888'}1F`, borderWidth: 1, borderColor: `${category.color ?? '#888'}40` }}>
          <MaterialCommunityIcons name={(category.icon as never) ?? 'shape-outline'} size={14} color={category.color ?? '#888'} />
          <Text className="font-inter font-semibold text-[11px]" style={{ color: category.color ?? '#888' }}>
            {category.name}
          </Text>
        </View>
      ) : null}
      <Text className="font-inter text-[11px] text-foreground/55 mt-2">{title} · {dateTimeText}</Text>
    </View>
  );
}
