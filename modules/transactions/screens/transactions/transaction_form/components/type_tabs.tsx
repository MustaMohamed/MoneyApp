// modules/transactions/screens/transactions/transaction_form/components/type_tabs.tsx
import { PressableFeedback } from 'heroui-native';
import { View } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text } from '@/components/ui/text';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

const label = tv({
  base: 'font-inter text-[13px]',
  variants: {
    active: { true: 'font-semibold', false: 'font-medium text-muted' },
    type: {
      expense: '',
      income: '',
      transfer: '',
      cc_payment: '',
    },
  },
  compoundVariants: [
    { active: true, type: 'expense', class: 'text-danger' },
    { active: true, type: 'income', class: 'text-success' },
    { active: true, type: 'transfer', class: 'text-info' },
    { active: true, type: 'cc_payment', class: 'text-accent-cc' },
  ],
});

const indicator = tv({
  variants: {
    type: {
      expense: 'bg-danger text-danger',
      income: 'bg-success text-success',
      transfer: 'bg-info text-info',
      cc_payment: 'bg-accent-cc text-accent-cc',
    },
  },
});

const TABS: Array<{ type: TransactionType; label: string }> = [
  { type: TransactionType.Expense, label: Strings.addTxTypeExpense },
  { type: TransactionType.Income, label: Strings.addTxTypeIncome },
  { type: TransactionType.Transfer, label: Strings.addTxTypeTransfer },
  { type: TransactionType.CCPayment, label: Strings.addTxTypeCCPayment },
];

interface Props {
  active: TransactionType;
  onSelect: (t: TransactionType) => void;
  disabled: boolean;
}

export function TypeTabs({ active, onSelect, disabled }: Props): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row' }} className="border-separator border-b">
      {TABS.map(({ type, label: lbl }) => {
        const isActive = type === active;
        return (
          <PressableFeedback
            key={type}
            testID={`type-tab-${type}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled }}
            isDisabled={disabled}
            onPress={() => onSelect(type)}
            style={{ position: 'relative' }}
            className="flex-1 items-center justify-center py-3"
          >
            <Text className={label({ active: isActive, type })}>{lbl}</Text>
            {isActive ? (
              <View
                testID={`type-tab-indicator-${type}`}
                style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2 }}
                className={indicator({ type })}
              />
            ) : null}
          </PressableFeedback>
        );
      })}
    </View>
  );
}
