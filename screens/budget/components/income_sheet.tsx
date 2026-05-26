import { Button } from 'heroui-native';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Sheet, useBottomSheetAwareHandlers } from '@/components/ui/bottom_sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { useIncomeSheetState } from '@/screens/budget/components/income_sheet.state';
import { useBudgetStore } from '@/store/budget.store';
import { ms } from '@/utils/responsive';

export function IncomeSheet() {
  const { sheetState, close, setAmountText } = useIncomeSheetState(
    useShallow((s) => ({
      sheetState: s.state,
      close: s.close,
      setAmountText: s.setAmountText,
    })),
  );
  const { setExpectedIncome } = useBudgetStore(
    useShallow((s) => ({ setExpectedIncome: s.setExpectedIncome })),
  );
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  const handleSave = async () => {
    const amount = parseFloat(sheetState.amountText);
    if (!isFinite(amount) || amount <= 0) return;
    await setExpectedIncome(amount);
    close();
  };

  return (
    <Sheet
      isOpen={sheetState.isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={Strings.incomeSheetTitle}
      size="sm"
      footer={
        <Button
          onPress={() => {
            void handleSave();
          }}
        >
          <Button.Label>{Strings.incomeSheetSaveCta}</Button.Label>
        </Button>
      }
    >
      <View style={styles.body}>
        <Text style={styles.label}>{Strings.incomeSheetAmountLabel}</Text>
        <View style={styles.field}>
          <TextInput
            value={sheetState.amountText}
            onChangeText={setAmountText}
            onFocus={onFocus}
            onBlur={onBlur}
            keyboardType="number-pad"
            placeholder={Strings.incomeSheetAmountPlaceholder}
            placeholderTextColor={Colors.dark.text3}
            style={styles.input}
            accessibilityLabel={Strings.incomeSheetAmountLabel}
          />
          <Text style={styles.suffix}>EGP</Text>
        </View>
        {sheetState.suggestion !== null &&
          sheetState.amountText === String(sheetState.suggestion) && (
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
