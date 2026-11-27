import React from 'react';
import { View } from 'react-native';

import { DetailRowsCard } from '@/components/ui/detail_rows_card';
import { SectionHeader } from '@/components/ui/section_header';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { lineHeightFor, Type } from '@/constants/theme';
import {
  SPENDING_PLAN_DETAIL_SPENDING_TEST_ID,
  type PlanSpendingCardVM,
} from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.helpers';
import { TransactionRowBody } from '@/modules/transactions/components/transaction_row';

interface Props {
  card: PlanSpendingCardVM;
  onRowPress: (id: string) => void;
}

const EMPTY_NOTE_STYLE = { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) };

export function SpendingPlanDetailSpendingCard({ card, onRowPress }: Props): React.ReactElement {
  return (
    <>
      <SectionHeader
        title={Strings.budgetPlansDetailSpending}
        meta={card.totalLabel}
        count={card.count}
      />
      <DetailRowsCard testID={SPENDING_PLAN_DETAIL_SPENDING_TEST_ID}>
        {card.emptyNote === undefined ? (
          card.rows.map((row, index) => (
            <TransactionRowBody
              key={row.id}
              presentation={row.presentation}
              onPress={() => onRowPress(row.id)}
              showSeparator={index < card.rows.length - 1}
              wrapsTitle
            />
          ))
        ) : (
          <View className="px-4 py-2">
            <Text className="font-inter text-content-secondary" style={EMPTY_NOTE_STYLE}>
              {card.emptyNote}
            </Text>
          </View>
        )}
      </DetailRowsCard>
    </>
  );
}
