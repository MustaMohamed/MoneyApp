import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { View } from 'react-native';

import { FORM_SHEET_CONTENT_CONTAINER_STYLE } from '@/components/ui/form_sheet.geometry';
import { FormSheetFooter } from '@/components/ui/form_sheet_footer';
import { Sheet } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import { SpendingPlanAllocations } from '@/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_allocations';
import {
  SpendingPlanFactCard,
  SpendingPlanTotalHero,
} from '@/modules/budget/screens/budget/spending_plan_sheet/components/spending_plan_sheet_fields';
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
        liftsAboveKeyboard
        footer={
          <FormSheetFooter
            statusTestID="spending-plan-status"
            showsStatusTrack
            footnote={state.dailyLine}
            message={state.footerLine}
            label={Strings.budgetPlanSave}
            isLoading={state.saving}
            isDisabled={state.saving}
            onPress={actions.save}
          />
        }
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          <SpendingPlanTotalHero
            control={state.control}
            form={{ setValue: actions.setValue, clearErrors: actions.clearErrors }}
            onTotalEdit={actions.editTotal}
            totalCarriesOverRing={state.totalCarriesOverRing}
          />
          <View style={FORM_SHEET_CONTENT_CONTAINER_STYLE}>
            <SpendingPlanFactCard
              control={state.control}
              startDate={state.startDate}
              endDate={state.endDate}
              categoriesValue={state.categoriesValue}
              onEdit={actions.clearSubmitError}
              onStartDateChange={actions.setStartDate}
              onEndDateChange={actions.setEndDate}
              onCategoriesPress={actions.openCategoryPicker}
            />
            <SpendingPlanAllocations
              isEnabled={state.allocateByCategory}
              onEnabledChange={actions.setAllocateByCategory}
              selectedCategories={state.selectedCategories}
              values={state.allocations}
              errors={state.allocationErrors}
              summaryText={state.allocationSummaryText}
              isOver={state.allocationIsOver}
              overRingedCategoryId={state.overRingedCategoryId}
              onAllocationTextChange={actions.setAllocationText}
              onFocus={actions.onFocus}
              onBlur={actions.onBlur}
            />
          </View>
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
