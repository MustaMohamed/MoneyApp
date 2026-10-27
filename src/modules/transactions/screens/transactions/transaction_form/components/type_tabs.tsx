import { FormTypeTabs } from '@/components/ui/form_type_tabs';
import type { TabSegment } from '@/components/ui/tabs';
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
  supportText: string;
  /** The account strip, drawn in the shared strip row. */
  children: React.ReactNode;
}

export function TypeTabs({
  active,
  incomeLabel,
  onSelect,
  isDisabled,
  supportText,
  children,
}: Props): React.ReactElement {
  const segments = TYPE_SEGMENTS.map((segment) =>
    segment.value === TransactionType.Income ? { ...segment, label: incomeLabel } : segment,
  );

  return (
    <FormTypeTabs<TransactionType>
      segments={segments}
      value={active}
      onValueChange={onSelect}
      accessibilityLabel={Strings.addTxTypeSelectorA11y}
      isDisabled={isDisabled}
      supportText={supportText}
      supportLines="one"
    >
      {children}
    </FormTypeTabs>
  );
}
