import React from 'react';
import { View } from 'react-native';

import { DetailRowsCard } from '@/components/ui/detail_rows_card';
import { SectionHeader } from '@/components/ui/section_header';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { SpendingPlanDetailCategoryRow } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_category_row';
import type { SpendingPlanDetailVM } from '@/modules/budget/screens/budget/spending_plans.types';

interface Props {
  card: NonNullable<SpendingPlanDetailVM['limitsCard']>;
}

export function SpendingPlanDetailLimitsCard({ card }: Props): React.ReactElement {
  return (
    <>
      <SectionHeader
        title={Strings.budgetPlansDetailCategories}
        meta={card.assignedLabel}
        count={card.rows.length}
      />
      <DetailRowsCard testID="spending-plan-detail-limits">
        {card.rows.map((row, index) => (
          <React.Fragment key={row.categoryId}>
            {index > 0 ? <View className="bg-separator" style={{ height: Size.hairline }} /> : null}
            <SpendingPlanDetailCategoryRow row={row} tickPercentage={card.tickPercentage} />
          </React.Fragment>
        ))}
      </DetailRowsCard>
    </>
  );
}
