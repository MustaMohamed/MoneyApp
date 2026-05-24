import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import type { TransactionFilter } from '../transactions.store';

interface Props {
  value: TransactionFilter;
  onChange: (v: TransactionFilter) => void;
}

const OPTIONS: { value: TransactionFilter; label: string }[] = [
  { value: 'all', label: Strings.filterAll },
  { value: TransactionType.Income, label: Strings.addTxTypeIncome },
  { value: TransactionType.Expense, label: Strings.addTxTypeExpense },
  { value: TransactionType.Transfer, label: Strings.addTxTypeTransfer },
  // CC Payment was missing — the filter has always had a CC Payment surface
  // (TransactionFilter accepts every TransactionType), but the chip itself
  // was never wired up. Without it, users cannot isolate credit-card
  // payments from the rest of the ledger.
  { value: TransactionType.CCPayment, label: Strings.addTxTypeCCPayment },
];

export function TypeChips({ value, onChange }: Props): React.ReactElement {
  return (
    <View className="mt-3 flex-row flex-wrap gap-1.5 px-4">
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
                ? 'border-accent/50 bg-accent/15 rounded-full border px-3 py-1'
                : 'bg-default/40 border-border rounded-full border px-3 py-1'
            }
          >
            <Text
              className={
                selected
                  ? 'font-inter text-accent text-[11px] font-semibold'
                  : 'font-inter text-foreground/65 text-[11px] font-medium'
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
