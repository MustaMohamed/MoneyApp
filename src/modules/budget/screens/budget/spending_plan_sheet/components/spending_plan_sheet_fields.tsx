import { Controller, type Control } from 'react-hook-form';
import type { BlurEvent, FocusEvent, KeyboardTypeOptions } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { spendingPlanSheetStyles as styles } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.styles';
import type { SpendingPlanFormValues } from '@/utils/schemas/budget.schema';

interface SpendingPlanFieldProps {
  control: Control<SpendingPlanFormValues>;
  name: 'nameText' | 'totalText';
  label: string;
  testID: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  variant: 'name' | 'amount';
  suffix?: string;
  onFocus: (event: FocusEvent) => void;
  onBlur: (event: BlurEvent) => void;
}

function SpendingPlanField(props: SpendingPlanFieldProps) {
  return (
    <Controller
      control={props.control}
      name={props.name}
      render={({ field: { value, onChange }, fieldState }) => (
        <Input
          testID={props.testID}
          value={value}
          onChangeText={onChange}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
          keyboardType={props.keyboardType}
          placeholder={props.placeholder}
          label={props.label}
          accessibilityLabel={props.label}
          isInvalid={fieldState.invalid}
          errorMessage={fieldState.error?.message}
          className="border-border bg-background h-10 min-h-0 px-3"
          style={props.variant === 'amount' ? styles.amountInput : styles.nameInput}
          suffix={props.suffix ? <Text style={styles.suffix}>{props.suffix}</Text> : undefined}
        />
      )}
    />
  );
}

interface SpendingPlanFormFieldsProps {
  control: Control<SpendingPlanFormValues>;
  onFocus: (event: FocusEvent) => void;
  onBlur: (event: BlurEvent) => void;
}

export function SpendingPlanFormFields({ control, onFocus, onBlur }: SpendingPlanFormFieldsProps) {
  return (
    <>
      <SpendingPlanField
        control={control}
        name="nameText"
        label={Strings.budgetPlanNameLabel}
        testID="spending-plan-name-input"
        placeholder={Strings.budgetPlanNamePlaceholder}
        variant="name"
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <SpendingPlanField
        control={control}
        name="totalText"
        label={Strings.budgetPlanAmountLabel}
        testID="spending-plan-total-input"
        placeholder={Strings.zeroAmountPlaceholder}
        keyboardType="number-pad"
        variant="amount"
        suffix={Strings.currencyEgp}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </>
  );
}
