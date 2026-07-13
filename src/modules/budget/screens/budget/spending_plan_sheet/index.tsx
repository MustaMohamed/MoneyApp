import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { SpendingPlanAllocations } from '@/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_allocations';
import { SpendingPlanCategorySelector } from '@/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_category_selector';
import { SpendingPlanDateRange } from '@/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_date_range';
import { SpendingPlanFormFields } from '@/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_sheet_fields';
import {
  type SpendingPlanSheetProps,
  useSpendingPlanSheet,
} from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.hook';
import { spendingPlanSheetStyles as styles } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.styles';
import { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';

export type { SpendingPlanSheetProps };

export function SpendingPlanSheet(props: SpendingPlanSheetProps) {
  const { state, ...actions } = useSpendingPlanSheet(props);

  return (
    <>
      <Sheet
        isOpen={state.isOpen}
        onOpenChange={(open) => {
          if (!open) actions.closeSheet();
        }}
        title={state.title}
        size="lg"
        scrollable
        footer={
          <Button
            variant="primary"
            label={Strings.budgetPlanSave}
            onPress={() => void actions.submit()}
            isLoading={state.saving}
            isDisabled={state.saving}
          />
        }
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bodyContent}
        >
          <SpendingPlanFormFields
            control={state.control}
            onFocus={actions.onFocus}
            onBlur={actions.onBlur}
          />
          <SpendingPlanDateRange
            startDate={state.startDate}
            endDate={state.endDate}
            datePickerTarget={state.datePickerTarget}
            datePickerValue={state.datePickerValue}
            openDatePicker={actions.openDatePicker}
            onDateChange={actions.changeDate}
          />
          <SpendingPlanCategorySelector
            selectedCategories={state.selectedCategories}
            onPress={actions.openCategoryPicker}
          />
          <SpendingPlanAllocations
            isEnabled={state.allocateByCategory}
            onEnabledChange={actions.setAllocateByCategory}
            selectedCategories={state.selectedCategories}
            values={state.allocations}
            helperText={state.allocationHelperText}
            isOver={state.allocationIsOver}
            onAllocationTextChange={actions.setAllocationText}
            onFocus={actions.onFocus}
            onBlur={actions.onBlur}
          />
          {state.submitError ? <Text style={styles.errorText}>{state.submitError}</Text> : null}
        </BottomSheetScrollView>
      </Sheet>

      <CategoryPickerSheet
        isOpen={state.categoryPickerOpen}
        title={Strings.budgetPlanPickCategories}
        categories={state.budgetableCategories}
        selectedIds={state.selectedCategoryIds}
        onSelect={actions.toggleCategory}
        onOpenChange={(open) => {
          if (!open) actions.closeCategoryPicker();
        }}
      />
    </>
  );
}
