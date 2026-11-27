import React from 'react';
import { View } from 'react-native';

import { DetailRowsCard } from '@/components/ui/detail_rows_card';
import { SectionHeader } from '@/components/ui/section_header';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';
import {
  BUDGET_CATEGORY_DETAIL_BUDGETS_CARD_TEST_ID,
  type CategoryBudgetsCardVM,
} from '@/modules/budget/screens/budget/category_detail/category_detail.helpers';

import { CategoryBudgetRingRow, CategoryUnassignedRow } from './category_budget_ring_row';

const EMPTY_LINE_TEXT = { fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) };

export function CategoryBudgetsCard({ card }: { card: CategoryBudgetsCardVM }) {
  return (
    <>
      <SectionHeader title={Strings.budgetCategoryDetailBudgetsTitle} count={card.count} />
      <DetailRowsCard testID={BUDGET_CATEGORY_DETAIL_BUDGETS_CARD_TEST_ID}>
        {card.emptyLine === undefined ? (
          <>
            {card.rows.map((row, index) => (
              <View key={row.id} className={index > 0 ? 'border-separator border-t' : undefined}>
                <CategoryBudgetRingRow row={row} />
              </View>
            ))}
            {card.unassigned ? (
              <View className="border-separator border-t">
                <CategoryUnassignedRow row={card.unassigned} />
              </View>
            ) : null}
          </>
        ) : (
          <Text className="font-inter text-content-secondary px-4 py-3" style={EMPTY_LINE_TEXT}>
            {card.emptyLine}
          </Text>
        )}
      </DetailRowsCard>
    </>
  );
}
