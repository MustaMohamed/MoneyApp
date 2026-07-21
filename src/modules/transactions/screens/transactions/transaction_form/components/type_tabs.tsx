import { View } from 'react-native';

import { SegmentedTabs, type TabSegment } from '@/components/ui/tabs';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

const TYPE_SEGMENTS: ReadonlyArray<TabSegment<TransactionType>> = [
  { value: TransactionType.Expense, label: Strings.addTxTypeExpense },
  { value: TransactionType.Income, label: Strings.addTxTypeIncome },
  { value: TransactionType.Transfer, label: Strings.addTxTypeTransfer },
  { value: TransactionType.CCPayment, label: Strings.addTxTypeCCPayment },
];

interface Props {
  active: TransactionType;
  incomeLabel: string;
  onSelect: (type: TransactionType) => void;
  isDisabled: boolean;
}

export function TypeTabs({ active, incomeLabel, onSelect, isDisabled }: Props): React.ReactElement {
  const segments = TYPE_SEGMENTS.map((segment) =>
    segment.value === TransactionType.Income ? { ...segment, label: incomeLabel } : segment,
  );

  return (
    <View className="border-separator border-b px-4 py-2">
      <SegmentedTabs<TransactionType>
        segments={segments}
        value={active}
        onValueChange={onSelect}
        variant="solid-gold"
        density="compact"
        listClassName="h-9 w-full rounded-lg"
        accessibilityLabel={Strings.addTxTypeSelectorA11y}
        isDisabled={isDisabled}
      />
    </View>
  );
}
