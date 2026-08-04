import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type } from '@/constants/theme';
import type { BudgetRuleLensVM } from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { MonthlyRuleSummary } from '@/modules/budget/screens/budget/components/fifty_thirty_twenty/monthly_rule_summary';
import { NotGroupedRow } from '@/modules/budget/screens/budget/components/fifty_thirty_twenty/not_grouped_row';
import { RuleLedger } from '@/modules/budget/screens/budget/components/fifty_thirty_twenty/rule_ledger';

interface FiftyThirtyTwentyLensProps {
  vm: BudgetRuleLensVM;
  selectedMonth: string;
  expandedGroup: BudgetGroup | undefined;
  onExpandedGroupChange: (group: BudgetGroup | undefined) => void;
  onEditIncome: () => void;
  onManageGroup: (group: BudgetGroup) => void;
}

export function FiftyThirtyTwentyLens({
  vm,
  expandedGroup,
  onExpandedGroupChange,
  onEditIncome,
  onManageGroup,
}: FiftyThirtyTwentyLensProps) {
  return (
    <>
      <MonthlyRuleSummary vm={vm} onEditIncome={onEditIncome} />
      <View className="mx-4 mt-4 mb-1 flex-row items-end justify-between">
        <Text
          style={{ fontSize: Type.micro }}
          className="font-inter-semibold text-content-secondary uppercase"
        >
          {Strings.budget5030BreakdownTitle}
        </Text>
        <Text style={{ fontSize: Type.micro }} className="font-inter text-content-secondary">
          {Strings.budget5030BreakdownSubtitle}
        </Text>
      </View>
      <RuleLedger
        buckets={vm.buckets}
        expandedGroup={expandedGroup}
        onExpandedGroupChange={onExpandedGroupChange}
        onManageGroup={onManageGroup}
      />
      {vm.notGrouped ? <NotGroupedRow value={vm.notGrouped} /> : null}
    </>
  );
}
