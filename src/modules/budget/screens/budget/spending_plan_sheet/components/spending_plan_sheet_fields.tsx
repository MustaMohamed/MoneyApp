import { Controller, type Control } from 'react-hook-form';
import type { BlurEvent, FocusEvent, KeyboardTypeOptions } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { maskFieldText } from '@/utils/money_text';
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
  onEdit: () => void;
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
          onChangeText={(text) => {
            // `maskFieldText` diffs the new text against `value`, the prior text on screen.
            const masked = maskFieldText(props.variant, value, text);
            if (masked === undefined) return;
            // Clearing above the guard would let a refused keystroke wipe a live error.
            props.onEdit();
            onChange(masked);
          }}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
          keyboardType={props.keyboardType}
          placeholder={props.placeholder}
          label={props.label}
          accessibilityLabel={props.label}
          isInvalid={fieldState.invalid}
          errorMessage={fieldState.error?.message}
          className={
            props.variant === 'amount'
              ? 'border-border bg-background font-sora-bold text-foreground h-10 min-h-0 px-3 text-[15px]'
              : 'border-border bg-background font-inter-semibold text-foreground h-10 min-h-0 px-3 text-[14px]'
          }
          suffix={
            props.suffix ? (
              <Text className="font-inter-semibold text-muted text-[12px]">{props.suffix}</Text>
            ) : undefined
          }
        />
      )}
    />
  );
}

interface SpendingPlanFormFieldsProps {
  control: Control<SpendingPlanFormValues>;
  onEdit: () => void;
  onFocus: (event: FocusEvent) => void;
  onBlur: (event: BlurEvent) => void;
}

export function SpendingPlanFormFields({
  control,
  onEdit,
  onFocus,
  onBlur,
}: SpendingPlanFormFieldsProps) {
  return (
    <>
      <SpendingPlanField
        control={control}
        name="nameText"
        label={Strings.budgetPlanNameLabel}
        testID="spending-plan-name-input"
        placeholder={Strings.budgetPlanNamePlaceholder}
        variant="name"
        onEdit={onEdit}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <SpendingPlanField
        control={control}
        name="totalText"
        label={Strings.budgetPlanAmountLabel}
        testID="spending-plan-total-input"
        placeholder={Strings.zeroAmountPlaceholder}
        keyboardType="decimal-pad"
        variant="amount"
        suffix={Strings.currencyEgp}
        onEdit={onEdit}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </>
  );
}
