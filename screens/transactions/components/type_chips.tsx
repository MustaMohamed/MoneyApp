import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { TransactionType } from '@/constants/enums';
import type { TransactionFilter } from '../transactions.store';

interface Props {
  value: TransactionFilter;
  onChange: (v: TransactionFilter) => void;
}

const OPTIONS: { value: TransactionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: TransactionType.Income, label: 'Income' },
  { value: TransactionType.Expense, label: 'Expense' },
  { value: TransactionType.Transfer, label: 'Transfer' },
  // CC Payment was missing — the filter has always had a CC Payment surface
  // (TransactionFilter accepts every TransactionType), but the chip itself
  // was never wired up. Without it, users cannot isolate credit-card
  // payments from the rest of the ledger.
  { value: TransactionType.CCPayment, label: 'CC Payment' },
];

export function TypeChips({ value, onChange }: Props): React.ReactElement {
  return (
    <View className="px-4 mt-3 flex-row gap-1.5 flex-wrap">
      {OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${opt.label}, type filter`}
            className={
              selected
                ? 'px-3 py-1 rounded-full border border-accent/50 bg-accent/15'
                : 'px-3 py-1 rounded-full border border-transparent bg-default/40'
            }
          >
            <Text
              className={
                selected
                  ? 'font-inter font-semibold text-[11px] text-accent'
                  : 'font-inter font-medium text-[11px] text-foreground/65'
              }
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
