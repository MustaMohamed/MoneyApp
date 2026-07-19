import { Text as HeroText } from 'heroui-native';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import { useIncomeSheet } from '@/modules/budget/screens/budget/components/income_sheet.hook';

export function IncomeSheet() {
  const { state, control, close, setAmountText, save } = useIncomeSheet();
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const amountLabel = Strings.incomeSheetAmountLabel(state.monthLabel);
  const amountAccessibilityLabel = `${amountLabel}, ${Strings.currencyEgp}`;

  return (
    <Sheet
      isOpen={state.isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={Strings.incomeSheetTitle}
      size="sm"
      isDismissable={!state.saving}
      footer={
        <Button
          variant="primary"
          label={Strings.incomeSheetSaveCta}
          isLoading={state.saving}
          isDisabled={state.saving}
          onPress={() => void save()}
        />
      }
    >
      <View className="px-4 pt-2">
        <HeroText className="font-inter text-muted mb-4 text-[12px] leading-5">
          {Strings.incomeSheetDescription(state.monthLabel)}
        </HeroText>
        <Controller
          control={control}
          name="amountText"
          render={({ field: { value, onBlur: onFieldBlur }, fieldState }) => {
            const errorMessage = fieldState.error?.message ?? state.errorMessage;
            return (
              <Input
                value={value}
                onChangeText={setAmountText}
                onFocus={onFocus}
                onBlur={(event) => {
                  onFieldBlur();
                  onBlur(event);
                }}
                keyboardType="number-pad"
                placeholder={Strings.incomeSheetAmountPlaceholder}
                placeholderColorClassName="text-muted"
                label={amountLabel}
                helperText={
                  state.suggestion !== null && value === String(state.suggestion)
                    ? Strings.incomeSheetSuggestionNote
                    : undefined
                }
                suffix={
                  <HeroText className="font-inter text-muted text-[13px] font-semibold">
                    {Strings.currencyEgp}
                  </HeroText>
                }
                isInvalid={errorMessage !== undefined}
                errorMessage={errorMessage}
                isDisabled={state.saving}
                className="font-sora text-foreground text-[20px] font-bold"
                accessibilityLabel={amountAccessibilityLabel}
                accessibilityHint={errorMessage}
              />
            );
          }}
        />
        {state.errorMessage || state.validationMessage ? (
          <View
            accessible
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            accessibilityLabel={state.errorMessage ?? state.validationMessage}
          />
        ) : null}
      </View>
    </Sheet>
  );
}
