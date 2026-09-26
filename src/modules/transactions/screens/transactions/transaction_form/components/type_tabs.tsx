import { View } from 'react-native';

import { SegmentedTabs, type TabSegment } from '@/components/ui/tabs';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { TRANSACTION_TYPE_ICONS } from '@/constants/transaction_type_icons';

const TYPE_SEGMENTS: ReadonlyArray<TabSegment<TransactionType>> = [
  {
    value: TransactionType.Expense,
    label: Strings.addTxTypeExpense,
    icon: TRANSACTION_TYPE_ICONS[TransactionType.Expense],
  },
  {
    value: TransactionType.Income,
    label: Strings.addTxTypeIncome,
    icon: TRANSACTION_TYPE_ICONS[TransactionType.Income],
  },
  {
    value: TransactionType.Transfer,
    label: Strings.addTxTypeTransfer,
    icon: TRANSACTION_TYPE_ICONS[TransactionType.Transfer],
  },
  {
    value: TransactionType.CCPayment,
    label: Strings.addTxTypeCCPayment,
    icon: TRANSACTION_TYPE_ICONS[TransactionType.CCPayment],
  },
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
        corners="form"
        listClassName="h-9 w-full"
        accessibilityLabel={Strings.addTxTypeSelectorA11y}
        isDisabled={isDisabled}
      />
    </View>
  );
}
