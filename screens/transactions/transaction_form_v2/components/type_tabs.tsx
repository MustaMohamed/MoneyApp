import { Pressable, View } from 'react-native';
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
  // The row owns the 1px bottom separator. Each active tab's 2px indicator
  // absolutely positions at bottom: -1 so its bottom edge meets the row's
  // bottom edge — the indicator visually sits ON the separator line, masking
  // it across the active tab's width. This is the standard Material-tabs
  // pattern; the previous implementation rendered the indicator INSIDE the
  // tab content flow (with mt-1), producing two parallel horizontal lines.
  return (
    <View style={{ flexDirection: 'row' }} className="border-b border-separator">
      {TABS.map(({ type, label: lbl }) => {
        const isActive = type === active;
        return (
          <Pressable
            key={type}
            testID={`type-tab-${type}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled }}
            disabled={disabled}
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
          </Pressable>
        );
      })}
    </View>
  );
}
