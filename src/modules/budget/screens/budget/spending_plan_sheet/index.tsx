import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Button } from '@/components/ui/button';
import { SHEET_FOOTER_CLEARANCE, Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { SpendingPlanAllocations } from '@/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_allocations';
import { SpendingPlanCategorySelector } from '@/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_category_selector';
import { SpendingPlanDateRange } from '@/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_date_range';
import { SpendingPlanFormFields } from '@/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_sheet_fields';
import {
  type SpendingPlanSheetProps,
  useSpendingPlanSheet,
} from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.hook';
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
          <>
            {state.submitError ? (
              <Text className="font-inter text-danger text-[11px]">{state.submitError}</Text>
            ) : null}
            <Button
              variant="primary"
              label={Strings.budgetPlanSave}
              onPress={() => void actions.submit()}
              isLoading={state.saving}
              isDisabled={state.saving}
            />
          </>
        }
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-4 pt-2"
          // SHEET_FOOTER_CLEARANCE is a fixed constant sized for a bare CTA and
          // nothing in the primitive measures the footer it is meant to clear, so
          // the message this sheet puts above Save grows the footer against a
          // reserve that does not move -- covering the bottom of the scroll view,
          // which is the last allocation row the message is asking the user to
          // fix. Paid here rather than in the constant: nine of its ten call
          // sites ship a bare CTA and would take dead space for a message they
          // never render. Spacing.xxl is two lines of the 11px message, so a
          // wrapped one clears too, and the term is 0 on every frame where the
          // footer is a bare CTA.
          contentContainerStyle={{
            paddingBottom: SHEET_FOOTER_CLEARANCE + (state.submitError ? Spacing.xxl : 0),
          }}
        >
          <SpendingPlanFormFields
            control={state.control}
            onEdit={actions.clearSubmitError}
            onFocus={actions.onFocus}
            onBlur={actions.onBlur}
          />
          <SpendingPlanDateRange
            startDate={state.startDate}
            endDate={state.endDate}
            datePickerTarget={state.datePickerTarget}
            datePickerValue={state.datePickerValue}
            openDatePicker={actions.openDatePicker}
            onDatePickerSelect={actions.selectDate}
            onDatePickerDismiss={actions.dismissDatePicker}
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
            errors={state.allocationErrors}
            helperText={state.allocationHelperText}
            isOver={state.allocationIsOver}
            onAllocationTextChange={actions.setAllocationText}
            onFocus={actions.onFocus}
            onBlur={actions.onBlur}
          />
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
