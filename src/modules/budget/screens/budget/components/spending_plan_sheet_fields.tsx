import { Input } from 'heroui-native';
import { Controller, type Control } from 'react-hook-form';
import { View, type BlurEvent, type FocusEvent, type KeyboardTypeOptions } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { spendingPlanSheetStyles as styles } from '@/modules/budget/screens/budget/components/spending_plan_sheet.styles';
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

function SpendingPlanField({
  control,
  name,
  label,
  testID,
  placeholder,
  keyboardType,
  variant,
  suffix,
  onFocus,
  onBlur,
}: SpendingPlanFieldProps) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange }, fieldState }) => (
          <>
            <View style={[styles.field, fieldState.error && styles.fieldError]}>
              <Input
                testID={testID}
                value={value}
                onChangeText={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                keyboardType={keyboardType}
                placeholder={placeholder}
                placeholderColorClassName="text-muted"
                className="h-7 min-h-0 flex-1 border-0 bg-transparent p-0"
                style={variant === 'amount' ? styles.amountInput : styles.nameInput}
                accessibilityLabel={label}
              />
              {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
            </View>
            {fieldState.error ? (
              <Text style={styles.errorText}>{fieldState.error.message}</Text>
            ) : null}
          </>
        )}
      />
    </>
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
        placeholder="0"
        keyboardType="number-pad"
        variant="amount"
        suffix={Strings.currencyEgp}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </>
  );
}
