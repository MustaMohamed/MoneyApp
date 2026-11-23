import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useId } from 'react';
import { Controller, type Control, type UseFormReturn } from 'react-hook-form';

import { AmountHero } from '@/components/ui/amount_hero';
import { DateRow } from '@/components/ui/date_row';
import { FormFactCell } from '@/components/ui/form_fact_cell';
import { FormPickerRow } from '@/components/ui/form_picker_row';
import { ListCard } from '@/components/ui/list_card';
import { NoteFactRow } from '@/components/ui/note_fact_row';
import { ValidationSlot } from '@/components/ui/validation_slot';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import {
  PLAN_TOTAL_REFUSES_ZERO,
  type SpendingPlanFormValues,
} from '@/utils/schemas/budget.schema';
import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

type SpendingPlanHoldForm = Pick<UseFormReturn<SpendingPlanFormValues>, 'setValue' | 'clearErrors'>;

interface SpendingPlanTotalHeroProps {
  control: Control<SpendingPlanFormValues>;
  form: SpendingPlanHoldForm;
  onTotalEdit: () => void;
  totalCarriesOverRing: boolean;
  totalFault: string | undefined;
}

export function SpendingPlanTotalHero({
  control,
  form,
  onTotalEdit,
  totalCarriesOverRing,
  totalFault,
}: SpendingPlanTotalHeroProps) {
  return (
    <>
      <Controller
        control={control}
        name="totalText"
        render={({ field }) => (
          <AmountHero
            value={field.value}
            onChange={(masked) => {
              // The hero has already refused a bad keystroke, so this edit is a real one.
              onTotalEdit();
              const held = holdStillTypingDecimal(
                form,
                'totalText',
                masked,
                PLAN_TOTAL_REFUSES_ZERO,
              );
              if (!held) field.onChange(masked);
            }}
            tone="foreground"
            currency={Currency.EGP}
            caption={Strings.budgetPlanAmountLabel}
            invalid={totalFault !== undefined || totalCarriesOverRing}
            accessibilityLabel={Strings.budgetPlanAmountLabel}
          />
        )}
      />
      <ValidationSlot
        testID="spending-plan-total-error-slot"
        liveTestID="spending-plan-total-error-live"
        message={totalFault}
      />
    </>
  );
}

interface SpendingPlanFactCardProps {
  control: Control<SpendingPlanFormValues>;
  startDate: string;
  endDate: string;
  categoriesValue: string;
  nameFault: string | undefined;
  endDateFault: string | undefined;
  categoriesFault: string | undefined;
  onEdit: () => void;
  onStartDateChange: (next: string) => void;
  onEndDateChange: (next: string) => void;
  onCategoriesPress: () => void;
}

export function SpendingPlanFactCard({
  control,
  startDate,
  endDate,
  categoriesValue,
  nameFault,
  endDateFault,
  categoriesFault,
  onEdit,
  onStartDateChange,
  onEndDateChange,
  onCategoriesPress,
}: SpendingPlanFactCardProps) {
  const startsOwnerId = useId();
  const endsOwnerId = useId();
  return (
    <ListCard testID="spending-plan-fact-group">
      <FormFactCell fault={nameFault} ringTestID="spending-plan-name-ring">
        <Controller
          control={control}
          name="nameText"
          render={({ field: { value, onChange, onBlur } }) => (
            <NoteFactRow
              inset={false}
              label={Strings.budgetPlanNameLabel}
              placeholder={Strings.budgetPlanNamePlaceholder}
              accessibilityHint={nameFault}
              value={value}
              onChangeText={(text) => {
                onEdit();
                onChange(text);
              }}
              onBlur={onBlur}
            />
          )}
        />
      </FormFactCell>
      <FormFactCell>
        <DateRow
          ownerId={startsOwnerId}
          value={startDate}
          onChange={onStartDateChange}
          divider={false}
          label={Strings.budgetPlanStartDate}
          testID="spending-plan-starts-row"
          pickerTitle={Strings.budgetPlanStartDate}
          capsAtToday={false}
          wrapsValue
        />
      </FormFactCell>
      <FormFactCell fault={endDateFault} ringTestID="spending-plan-ends-ring">
        <DateRow
          ownerId={endsOwnerId}
          value={endDate}
          onChange={onEndDateChange}
          divider={false}
          label={Strings.budgetPlanEndDate}
          testID="spending-plan-ends-row"
          pickerTitle={Strings.budgetPlanEndDate}
          capsAtToday={false}
          wrapsValue
          accessibilityHint={endDateFault}
        />
      </FormFactCell>
      <FormFactCell
        divider={false}
        fault={categoriesFault}
        ringTestID="spending-plan-categories-ring"
      >
        <FormPickerRow
          testID="spending-plan-categories-row"
          divider={false}
          label={Strings.budgetPlanCategories}
          value={categoriesValue}
          onPress={onCategoriesPress}
          accessibilityHint={categoriesFault}
          suffix={
            <MaterialCommunityIcons
              name="chevron-right"
              size={Size.iconSm}
              color={CoreTokens.text2}
            />
          }
        />
      </FormFactCell>
    </ListCard>
  );
}
