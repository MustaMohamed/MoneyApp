import { SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

import { ListCard } from '@/components/ui/list_card';
import { Strings } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { TRANSACTION_FORM_SKELETON_GEOMETRY } from './transaction_form_geometry';

const FACT_ROWS = Array.from(
  { length: TRANSACTION_FORM_SKELETON_GEOMETRY.factRowCount },
  (_, row) => row,
);
const LAST_FACT_ROW = FACT_ROWS.length - 1;

export function TransactionFormLoading(): React.ReactElement {
  return (
    <View
      testID="transaction-form-loading"
      style={{ flex: 1 }}
      accessibilityLabel={Strings.loadingTransactionA11y}
    >
      <SkeletonGroup isLoading isSkeletonOnly>
        <View className="border-separator border-b px-4 py-2">
          <SkeletonGroup.Item
            className="w-full"
            style={{ height: TRANSACTION_FORM_SKELETON_GEOMETRY.tabBar, borderRadius: Radius.sm }}
          />
        </View>
        <View className="border-separator min-h-8 justify-center border-b px-4 py-1.5">
          <SkeletonGroup.Item className="h-3 w-2/3 rounded-md" />
        </View>
        <View
          className="border-separator items-center justify-center border-b py-4"
          style={{ minHeight: ms(80) }}
        >
          <SkeletonGroup.Item
            className="w-40"
            style={{ height: TRANSACTION_FORM_SKELETON_GEOMETRY.amount, borderRadius: Radius.sm }}
          />
        </View>
        <View style={{ flex: 1, padding: Spacing.md }}>
          <SkeletonGroup.Item
            testID="transaction-form-skeleton-account-row"
            className="w-full"
            style={{
              height: TRANSACTION_FORM_SKELETON_GEOMETRY.accountRow,
              borderRadius: Radius.sm,
            }}
          />
          <ListCard
            testID="transaction-form-skeleton-fact-group"
            style={{ marginTop: TRANSACTION_FORM_SKELETON_GEOMETRY.rowGap }}
          >
            {FACT_ROWS.map((row) => (
              <View
                key={row}
                testID="transaction-form-skeleton-fact-row"
                className={row === LAST_FACT_ROW ? 'px-4' : 'border-separator border-b px-4'}
                style={{
                  minHeight: TRANSACTION_FORM_SKELETON_GEOMETRY.factRow,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <SkeletonGroup.Item
                  className="rounded-md"
                  style={TRANSACTION_FORM_SKELETON_GEOMETRY.keyBar}
                />
                <SkeletonGroup.Item
                  className="rounded-md"
                  style={TRANSACTION_FORM_SKELETON_GEOMETRY.valueBar}
                />
              </View>
            ))}
          </ListCard>
        </View>
      </SkeletonGroup>
    </View>
  );
}
