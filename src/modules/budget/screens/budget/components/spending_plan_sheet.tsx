import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { SpendingPlanAllocations } from '@/modules/budget/screens/budget/components/spending_plan_allocations';
import { SpendingPlanCategorySelector } from '@/modules/budget/screens/budget/components/spending_plan_category_selector';
import { SpendingPlanDateRange } from '@/modules/budget/screens/budget/components/spending_plan_date_range';
import {
  type SpendingPlanSheetProps,
  useSpendingPlanSheet,
} from '@/modules/budget/screens/budget/components/spending_plan_sheet.hook';
import { spendingPlanSheetStyles as styles } from '@/modules/budget/screens/budget/components/spending_plan_sheet.styles';
import { SpendingPlanFormFields } from '@/modules/budget/screens/budget/components/spending_plan_sheet_fields';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';

export type { SpendingPlanSheetProps };

export function SpendingPlanSheet(props: SpendingPlanSheetProps) {
  const sheet = useSpendingPlanSheet(props);

  return (
    <>
      <Sheet
        isOpen={sheet.isOpen}
        onOpenChange={sheet.onSheetOpenChange}
        title={sheet.title}
        size="lg"
        scrollable
        footer={
          <Button
            variant="primary"
            label={Strings.budgetPlanSave}
            onPress={() => void sheet.form.onSubmit()}
          />
        }
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bodyContent}
        >
          <SpendingPlanFormFields
            control={sheet.form.control}
            onFocus={sheet.form.onFocus}
            onBlur={sheet.form.onBlur}
          />
          <SpendingPlanDateRange {...sheet.dateRange} />
          <SpendingPlanCategorySelector {...sheet.categorySelector} />
          <SpendingPlanAllocations {...sheet.allocations} />
          {sheet.form.submitError ? (
            <Text style={styles.errorText}>{sheet.form.submitError}</Text>
          ) : null}
        </BottomSheetScrollView>
      </Sheet>

      <CategoryPickerSheet {...sheet.categoryPicker} />
    </>
  );
}
