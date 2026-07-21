import { SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { TRANSACTION_FORM_ERROR_SLOT_HEIGHT } from '../transaction_form_body';
import { DATE_ROW_HEIGHT } from './date_row';

const PICKER_ROWS = [0, 1];

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
            style={{ height: ms(36), borderRadius: Radius.sm }}
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
            style={{ height: ms(40), borderRadius: Radius.sm }}
          />
        </View>
        <View style={{ height: TRANSACTION_FORM_ERROR_SLOT_HEIGHT }} />
        <View style={{ flex: 1, padding: Spacing.md, gap: Spacing.xs }}>
          {PICKER_ROWS.map((row) => (
            <View key={row}>
              <SkeletonGroup.Item
                className="w-full"
                style={{ height: DATE_ROW_HEIGHT, borderRadius: Radius.md }}
              />
              <View style={{ height: TRANSACTION_FORM_ERROR_SLOT_HEIGHT }} />
            </View>
          ))}
          <SkeletonGroup.Item
            className="w-full"
            style={{ height: DATE_ROW_HEIGHT, marginTop: Spacing.xs, borderRadius: Radius.md }}
          />
          <SkeletonGroup.Item
            className="w-full"
            style={{ height: DATE_ROW_HEIGHT, borderRadius: Radius.md }}
          />
          <View style={{ height: TRANSACTION_FORM_ERROR_SLOT_HEIGHT }} />
        </View>
      </SkeletonGroup>
    </View>
  );
}
