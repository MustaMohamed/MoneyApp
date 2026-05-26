import { Text } from 'heroui-native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { FormErrorText } from '@/components/ui/form_error_text';
import { FormSectionLabel } from '@/components/ui/form_section_label';
import { Input } from '@/components/ui/input';
import { Sheet, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import { parseAdjustInput } from './adjust_balance_sheet.helpers';
import { useAdjustBalanceSheetState } from './adjust_balance_sheet.state';

interface AdjustBalanceSheetProps {
  isOpen: boolean;
  currentBalance: number;
  currency: Currency;
  onOpenChange: (open: boolean) => void;
  onSave: (newBalance: number) => void;
  isLoading: boolean;
}

export function AdjustBalanceSheet({
  isOpen,
  currentBalance,
  currency,
  onOpenChange,
  onSave,
  isLoading,
}: AdjustBalanceSheetProps) {
  const {
    state: adjustState,
    setInput,
    setError,
    initialize,
  } = useAdjustBalanceSheetState(
    useShallow((s) => ({
      state: s.state,
      setInput: s.setInput,
      setError: s.setError,
      initialize: s.initialize,
    })),
  );

  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  // Seed the input from the current balance whenever the sheet opens.
  useEffect(() => {
    if (isOpen) {
      initialize(currentBalance);
    }
  }, [isOpen, currentBalance, initialize]);

  const handleSave = () => {
    const result = parseAdjustInput(adjustState.input);
    if (!result.ok) {
      setError(Strings.errBalanceInvalid);
      return;
    }
    setError('');
    onSave(result.value);
  };

  const footer = (
    <Box style={{ flexDirection: 'row' }} className="gap-2">
      <Box style={{ flex: 1 }}>
        <Button
          variant="secondary"
          label={Strings.adjustBalanceCancel}
          onPress={() => onOpenChange(false)}
        />
      </Box>
      <Box style={{ flex: 2 }}>
        <Button
          variant="primary"
          label={Strings.adjustBalanceSave}
          onPress={handleSave}
          isDisabled={isLoading}
          isLoading={isLoading}
        />
      </Box>
    </Box>
  );

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={Strings.adjustBalanceTitle}
      size="sm"
      footer={footer}
    >
      <Box className="px-4 pt-2">
        <FormSectionLabel>{Strings.adjustBalanceLabel}</FormSectionLabel>
        <Box style={{ flexDirection: 'row' }} className="items-center gap-2">
          <View style={{ flex: 1 }}>
            <Input
              value={adjustState.input}
              onChangeText={(v) => {
                setInput(v);
                setError('');
              }}
              onFocus={onFocus}
              onBlur={onBlur}
              keyboardType="decimal-pad"
              isInvalid={!!adjustState.error}
            />
          </View>
          <Text className="text-muted font-sora-bold text-[15px]">{currency}</Text>
        </Box>
        <FormErrorText message={adjustState.error || undefined} />
      </Box>
    </Sheet>
  );
}
