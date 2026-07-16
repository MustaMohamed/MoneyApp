import { Text as HeroText } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import { useIncomeSheet } from '@/modules/budget/screens/budget/components/income_sheet.hook';

export function IncomeSheet() {
  const { state, close, setAmountText, save } = useIncomeSheet();
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const amountLabel = Strings.incomeSheetAmountLabel(state.monthLabel);

  return (
    <Sheet
      isOpen={state.isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={Strings.incomeSheetTitle}
      size="sm"
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
        <Input
          value={state.amountText}
          onChangeText={setAmountText}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardType="number-pad"
          placeholder={Strings.incomeSheetAmountPlaceholder}
          placeholderColorClassName="text-muted"
          label={amountLabel}
          helperText={
            state.suggestion !== null && state.amountText === String(state.suggestion)
              ? Strings.incomeSheetSuggestionNote
              : undefined
          }
          suffix={
            <HeroText className="font-inter text-muted text-[13px] font-semibold">
              {Strings.currencyEgp}
            </HeroText>
          }
          isInvalid={state.errorMessage !== undefined}
          errorMessage={state.errorMessage}
          isDisabled={state.saving}
          className="font-sora text-foreground text-[20px] font-bold"
          accessibilityLabel={amountLabel}
          accessibilityHint={state.errorMessage}
        />
        {state.errorMessage ? (
          <View
            accessible
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            accessibilityLabel={state.errorMessage}
          />
        ) : null}
      </View>
    </Sheet>
  );
}
