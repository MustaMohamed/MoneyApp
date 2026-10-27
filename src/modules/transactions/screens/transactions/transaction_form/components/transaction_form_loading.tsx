import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import {
  ACCOUNT_STRIP_CHIP_RADIUS,
  ACCOUNT_STRIP_GAP,
  ACCOUNT_STRIP_INSET_X,
  ACCOUNT_STRIP_PADDING_Y,
  FORM_SHEET_CONTENT_CONTAINER_STYLE,
} from '@/components/ui/form_sheet.geometry';
import { FormSupportLineSlot, FormTypeTabsRow } from '@/components/ui/form_type_tabs';
import { ListCard } from '@/components/ui/list_card';
import { Strings } from '@/constants/strings';
import { Radius } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import {
  TRANSACTION_FORM_SKELETON_GEOMETRY,
  resolveTransactionFormSkeletonBars,
  resolveTypeTabsSkeletonHeight,
} from './transaction_form.geometry';

const STRIP_BARS = Array.from(
  { length: TRANSACTION_FORM_SKELETON_GEOMETRY.stripBarCount },
  (_, bar) => bar,
);
const FACT_ROWS = Array.from(
  { length: TRANSACTION_FORM_SKELETON_GEOMETRY.factRowCount },
  (_, row) => row,
);
const LAST_FACT_ROW = FACT_ROWS.length - 1;

export function TransactionFormLoading(): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const skeletonHeight = resolveTypeTabsSkeletonHeight(fontScale);
  const bars = resolveTransactionFormSkeletonBars(fontScale);
  return (
    <View
      testID="transaction-form-loading"
      style={{ flex: 1 }}
      accessibilityLabel={Strings.loadingTransactionA11y}
    >
      <SkeletonGroup isLoading isSkeletonOnly style={{ flex: 1 }}>
        <FormTypeTabsRow>
          <SkeletonGroup.Item
            className="w-full"
            style={{ height: skeletonHeight, borderRadius: Radius.sm }}
          />
        </FormTypeTabsRow>
        <FormSupportLineSlot>
          <SkeletonGroup.Item className="w-2/3 rounded-md" style={{ height: bars.supportingBar }} />
        </FormSupportLineSlot>
        <View
          className="border-separator border-b"
          style={{ paddingVertical: ACCOUNT_STRIP_PADDING_Y }}
        >
          <View
            testID="transaction-form-skeleton-strip"
            style={{
              marginHorizontal: ACCOUNT_STRIP_INSET_X,
              flexDirection: 'row',
              gap: ACCOUNT_STRIP_GAP,
              overflow: 'hidden',
            }}
          >
            {STRIP_BARS.map((bar) => (
              <SkeletonGroup.Item
                key={bar}
                testID="transaction-form-skeleton-strip-bar"
                style={{
                  ...bars.stripBar,
                  flexShrink: 0,
                  borderRadius: ACCOUNT_STRIP_CHIP_RADIUS,
                }}
              />
            ))}
          </View>
        </View>
        <View
          className="border-separator items-center justify-center border-b py-4"
          style={{ minHeight: ms(80) }}
        >
          <SkeletonGroup.Item
            className="w-40"
            style={{ height: bars.amount, borderRadius: Radius.sm }}
          />
        </View>
        <BottomSheetScrollView
          testID="transaction-form-skeleton-scroll"
          style={{ flex: 1 }}
          contentContainerStyle={FORM_SHEET_CONTENT_CONTAINER_STYLE}
          showsVerticalScrollIndicator={false}
        >
          <ListCard testID="transaction-form-skeleton-fact-group">
            {FACT_ROWS.map((row) => (
              <View
                key={row}
                testID="transaction-form-skeleton-fact-row"
                className={row === LAST_FACT_ROW ? 'px-4' : 'border-separator border-b px-4'}
                style={{
                  height: bars.factRow,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <SkeletonGroup.Item className="rounded-md" style={bars.keyBar} />
                <SkeletonGroup.Item className="rounded-md" style={bars.valueBar} />
              </View>
            ))}
          </ListCard>
        </BottomSheetScrollView>
      </SkeletonGroup>
    </View>
  );
}
