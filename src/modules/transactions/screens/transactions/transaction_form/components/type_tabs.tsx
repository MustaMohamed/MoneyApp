import { FormTypeTabs } from '@/components/ui/form_type_tabs';
import type { TabSegment } from '@/components/ui/tabs';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { TRANSACTION_TYPE_ICONS } from '@/constants/transaction_type_icons';
import { orderByRank } from '@/utils/rank_order';

const TYPE_TAB_RANK = {
  [TransactionType.Expense]: 0,
  [TransactionType.Income]: 1,
  [TransactionType.Transfer]: 2,
  [TransactionType.CCPayment]: 3,
} satisfies Record<TransactionType, number>;

const TYPE_TAB_LABELS: Record<TransactionType, string> = {
  [TransactionType.Expense]: Strings.addTxTypeExpense,
  [TransactionType.Income]: Strings.addTxTypeIncome,
  [TransactionType.Transfer]: Strings.addTxTypeTransfer,
  [TransactionType.CCPayment]: Strings.addTxTypeCCPayment,
};

const TYPE_SEGMENTS: ReadonlyArray<TabSegment<TransactionType>> = orderByRank(TYPE_TAB_RANK).map(
  (type) => ({ value: type, label: TYPE_TAB_LABELS[type], icon: TRANSACTION_TYPE_ICONS[type] }),
);

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
