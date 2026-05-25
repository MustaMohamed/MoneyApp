import React from 'react';
import { View } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
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
      {OPTIONS.map((opt) => (
        <SelectablePill
          key={String(opt.value)}
          label={opt.label}
          selected={opt.value === value}
          onPress={() => onChange(opt.value)}
          accessibilityLabel={`${opt.label}, type filter`}
        />
      ))}
    </View>
  );
}
