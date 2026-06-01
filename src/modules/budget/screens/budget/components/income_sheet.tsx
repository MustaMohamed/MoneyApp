import { Input } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { IncomeSheetStateSetup } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { ms } from '@/utils/responsive';

type IncomeSheetProps = {
  incomeSheetState: IncomeSheetStateSetup;
};

export function IncomeSheet({ incomeSheetState }: IncomeSheetProps) {
  const { state, close, setAmountText } = incomeSheetState;
  const isOpen = state.isOpen.value;
  const amountText = state.amountText.value;
  const suggestion = state.suggestion.value;
  const { setExpectedIncome } = useBudgetStore();
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  const handleSave = async () => {
    const amount = parseFloat(amountText);
    if (!isFinite(amount) || amount <= 0) return;
    await setExpectedIncome(amount);
    close();
  };

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={Strings.incomeSheetTitle}
      size="sm"
      footer={
        <Button
          variant="primary"
          label={Strings.incomeSheetSaveCta}
          onPress={() => {
            void handleSave();
          }}
        />
      }
    >
      <View style={styles.body}>
        <Text style={styles.label}>{Strings.incomeSheetAmountLabel}</Text>
        <View style={styles.field}>
          <Input
            value={amountText}
            onChangeText={setAmountText}
            onFocus={onFocus}
            onBlur={onBlur}
            keyboardType="number-pad"
            placeholder={Strings.incomeSheetAmountPlaceholder}
            placeholderColorClassName="text-[#888]"
            className="flex-1 border-0 bg-transparent p-0"
            style={styles.input}
            accessibilityLabel={Strings.incomeSheetAmountLabel}
          />
          <Text style={styles.suffix}>EGP</Text>
        </View>
        {suggestion !== null && amountText === String(suggestion) && (
          <Text style={styles.suggestionNote}>{Strings.incomeSheetSuggestionNote}</Text>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginBottom: Spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.bg,
    borderWidth: ms(1.5),
    borderColor: Colors.dark.gold,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: Colors.dark.text1,
    padding: 0,
  },
  suffix: { fontFamily: FontFamily.interSemi, fontSize: Type.body, color: Colors.dark.text2 },
  suggestionNote: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
});
