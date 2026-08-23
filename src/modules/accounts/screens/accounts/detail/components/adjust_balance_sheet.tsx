import { Typography } from 'heroui-native';
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
  // Promise-returning on purpose: `handleSave` awaits it, so the caller's
  // rejection cannot become an unhandled one on the way out of a void handler.
  onSave: (newBalance: number) => void | Promise<void>;
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
  const { input, error } = useAdjustBalanceSheetState(
    useShallow((s) => ({ input: s.input, error: s.error })),
  );
  const setInput = useAdjustBalanceSheetState.getState().setInput;
  const setError = useAdjustBalanceSheetState.getState().setError;
  const initialize = useAdjustBalanceSheetState.getState().initialize;

  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  // Seed the input from the current balance whenever the sheet opens.
  useEffect(() => {
    if (isOpen) {
      initialize(currentBalance);
    }
  }, [isOpen, currentBalance, initialize]);

  const handleSave = async () => {
    const result = parseAdjustInput(input);
    if (!result.ok) {
      setError(Strings.errBalanceInvalid);
      return;
    }
    // Clear the parse error before the write, so a save failure replaces it
    // rather than sitting under it.
    setError('');
    await onSave(result.value);
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
          onPress={() => void handleSave()}
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
              value={input}
              onChangeText={(v) => {
                setInput(v);
                setError('');
              }}
              onFocus={onFocus}
              onBlur={onBlur}
              keyboardType="decimal-pad"
              isInvalid={!!error}
            />
          </View>
          <Typography className="text-muted font-sora-bold text-[15px]">{currency}</Typography>
        </Box>
        <FormErrorText message={error || undefined} />
      </Box>
    </Sheet>
  );
}
