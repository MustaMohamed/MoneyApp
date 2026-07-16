import { Input, Text as HeroText } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
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
        <HeroText className="font-inter text-muted mb-2 text-[11px] font-medium">
          {amountLabel}
        </HeroText>
        <View className="bg-background border-accent flex-row items-center rounded-lg border px-3 py-2">
          <Input
            value={state.amountText}
            onChangeText={setAmountText}
            onFocus={onFocus}
            onBlur={onBlur}
            editable={!state.saving}
            keyboardType="number-pad"
            placeholder={Strings.incomeSheetAmountPlaceholder}
            placeholderColorClassName="text-muted"
            className="font-sora text-foreground flex-1 border-0 bg-transparent p-0 text-[20px] font-bold"
            accessibilityLabel={amountLabel}
          />
          <HeroText className="font-inter text-muted text-[13px] font-semibold">
            {Strings.currencyEgp}
          </HeroText>
        </View>
        {state.suggestion !== null && state.amountText === String(state.suggestion) ? (
          <HeroText className="font-inter text-muted mt-2 text-[10px] italic">
            {Strings.incomeSheetSuggestionNote}
          </HeroText>
        ) : null}
        {state.errorMessage ? (
          <HeroText
            accessibilityRole="alert"
            className="font-inter text-danger mt-2 text-[11px] font-medium"
          >
            {state.errorMessage}
          </HeroText>
        ) : null}
      </View>
    </Sheet>
  );
}
