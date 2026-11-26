import React from 'react';
import { View } from 'react-native';

import { DetailRowsCard } from '@/components/ui/detail_rows_card';
import { FactRow } from '@/components/ui/fact_row';
import { SectionHeader } from '@/components/ui/section_header';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { SpendingPlanDetailCategoryRow } from '@/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_category_row';
import type { SpendingPlanDetailVM } from '@/modules/budget/screens/budget/spending_plans.types';

interface Props {
  card: NonNullable<SpendingPlanDetailVM['flexibleCard']>;
}

function Hairline(): React.ReactElement {
  return <View className="bg-separator" style={{ height: Size.hairline }} />;
}

export function SpendingPlanDetailFlexibleCard({ card }: Props): React.ReactElement {
  return (
    <>
      <SectionHeader title={Strings.budgetPlansDetailFlexible} meta={card.amountLabel} />
      <DetailRowsCard testID="spending-plan-detail-flexible">
        {card.rows.map((row, index) => (
          <React.Fragment key={row.categoryId}>
            {index > 0 ? <Hairline /> : null}
            <SpendingPlanDetailCategoryRow row={row} />
          </React.Fragment>
        ))}
        {card.footer ? (
          <>
            {card.rows.length > 0 ? <Hairline /> : null}
            <FactRow
              label={card.footer.label}
              value={card.footer.amountLabel}
              valueFace="sora"
              valueColor={card.footer.amountColor}
              holdsAmount
              showDivider={false}
            />
          </>
        ) : null}
      </DetailRowsCard>
    </>
  );
}
