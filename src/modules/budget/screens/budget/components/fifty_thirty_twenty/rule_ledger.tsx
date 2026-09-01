import { Accordion, Card } from 'heroui-native';

import { BudgetGroup } from '@/constants/enums';
import type { RuleBucketVM } from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { RuleBucketRow } from '@/modules/budget/screens/budget/components/fifty_thirty_twenty/rule_bucket_row';

interface RuleLedgerProps {
  buckets: RuleBucketVM[];
  expandedGroup: BudgetGroup | undefined;
  onExpandedGroupChange: (group: BudgetGroup | undefined) => void;
  onManageGroup: (group: BudgetGroup) => void;
}

function isBudgetGroup(value: string | undefined): value is BudgetGroup {
  return value === BudgetGroup.Need || value === BudgetGroup.Want || value === BudgetGroup.Savings;
}

export function RuleLedger({
  buckets,
  expandedGroup,
  onExpandedGroupChange,
  onManageGroup,
}: RuleLedgerProps) {
  return (
    <Card
      className="bg-surface border-border mx-4 rounded-2xl border p-0"
      style={{ boxShadow: 'none' }}
    >
      <Card.Body className="p-0">
        <Accordion
          selectionMode="single"
          value={expandedGroup ?? ''}
          onValueChange={(value: string | undefined) =>
            onExpandedGroupChange(isBudgetGroup(value) ? value : undefined)
          }
          hideSeparator={false}
          className="p-0"
        >
          {buckets.map((bucket) => (
            <RuleBucketRow
              key={bucket.group}
              bucket={bucket}
              isExpanded={expandedGroup === bucket.group}
              onManage={onManageGroup}
            />
          ))}
        </Accordion>
      </Card.Body>
    </Card>
  );
}
