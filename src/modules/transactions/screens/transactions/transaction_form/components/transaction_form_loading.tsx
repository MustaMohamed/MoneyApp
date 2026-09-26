import { SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { FACT_ROW_MIN_HEIGHT } from './form_picker_row';

export const TRANSACTION_FORM_SKELETON_GEOMETRY = {
  tabBar: ms(36),
  amount: ms(40),
  accountRow: FACT_ROW_MIN_HEIGHT,
  factRow: FACT_ROW_MIN_HEIGHT,
  factRowCount: 4,
  keyBar: { width: ms(60), height: ms(14) },
  valueBar: { width: ms(100), height: ms(14) },
  rowGap: Spacing.md,
} as const;

const GEOMETRY = TRANSACTION_FORM_SKELETON_GEOMETRY;
const FACT_ROWS = Array.from({ length: GEOMETRY.factRowCount }, (_, row) => row);

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
            style={{ height: GEOMETRY.tabBar, borderRadius: Radius.sm }}
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
            style={{ height: GEOMETRY.amount, borderRadius: Radius.sm }}
          />
        </View>
        <View style={{ flex: 1, padding: Spacing.md }}>
          <SkeletonGroup.Item
            className="w-full"
            style={{ height: GEOMETRY.accountRow, borderRadius: Radius.sm }}
          />
          <View style={{ marginTop: GEOMETRY.rowGap }}>
            {FACT_ROWS.map((row) => (
              <View
                key={row}
                className="border-separator border-b"
                style={{
                  minHeight: GEOMETRY.factRow,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <SkeletonGroup.Item className="rounded-md" style={GEOMETRY.keyBar} />
                <SkeletonGroup.Item className="rounded-md" style={GEOMETRY.valueBar} />
              </View>
            ))}
          </View>
        </View>
      </SkeletonGroup>
    </View>
  );
}
