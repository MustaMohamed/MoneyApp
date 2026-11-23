import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useId } from 'react';
import { Controller, type Control, type UseFormReturn } from 'react-hook-form';

import { AmountHero } from '@/components/ui/amount_hero';
import { DateRow } from '@/components/ui/date_row';
import { FormFactCell } from '@/components/ui/form_fact_cell';
import { FormPickerRow } from '@/components/ui/form_picker_row';
import { ListCard } from '@/components/ui/list_card';
import { NoteFactRow } from '@/components/ui/note_fact_row';
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
}

export function SpendingPlanTotalHero({
  control,
  form,
  onTotalEdit,
  totalCarriesOverRing,
}: SpendingPlanTotalHeroProps) {
  return (
    <Controller
      control={control}
      name="totalText"
      render={({ field }) => (
        <AmountHero
          value={field.value}
          onChange={(masked) => {
            // The hero has already refused a bad keystroke, so this edit is a real one.
            onTotalEdit();
            const held = holdStillTypingDecimal(form, 'totalText', masked, PLAN_TOTAL_REFUSES_ZERO);
            if (!held) field.onChange(masked);
          }}
          tone="foreground"
          currency={Currency.EGP}
          caption={Strings.budgetPlanAmountLabel}
          invalid={totalCarriesOverRing}
          accessibilityLabel={Strings.budgetPlanAmountLabel}
        />
      )}
    />
  );
}

interface SpendingPlanFactCardProps {
  control: Control<SpendingPlanFormValues>;
  startDate: string;
  endDate: string;
  categoriesValue: string;
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
  onEdit,
  onStartDateChange,
  onEndDateChange,
  onCategoriesPress,
}: SpendingPlanFactCardProps) {
  const startsOwnerId = useId();
  const endsOwnerId = useId();
  return (
    <ListCard testID="spending-plan-fact-group">
      <FormFactCell>
        <Controller
          control={control}
          name="nameText"
          render={({ field: { value, onChange, onBlur } }) => (
            <NoteFactRow
              inset={false}
              label={Strings.budgetPlanNameLabel}
              placeholder={Strings.budgetPlanNamePlaceholder}
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
        />
      </FormFactCell>
      <FormFactCell>
        <DateRow
          ownerId={endsOwnerId}
          value={endDate}
          onChange={onEndDateChange}
          divider={false}
          label={Strings.budgetPlanEndDate}
          testID="spending-plan-ends-row"
          pickerTitle={Strings.budgetPlanEndDate}
          capsAtToday={false}
        />
      </FormFactCell>
      <FormFactCell divider={false}>
        <FormPickerRow
          testID="spending-plan-categories-row"
          divider={false}
          label={Strings.budgetPlanCategories}
          value={categoriesValue}
          onPress={onCategoriesPress}
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
