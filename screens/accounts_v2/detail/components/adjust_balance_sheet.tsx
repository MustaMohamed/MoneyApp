import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import { parseAdjustInput } from './adjust_balance_sheet.helpers';
import { useAdjustBalanceSheetState } from './adjust_balance_sheet.state';

interface AdjustBalanceSheetProps {
  visible: boolean;
  currentBalance: number;
  currency: Currency;
  onClose: () => void;
  onSave: (newBalance: number) => void;
  isLoading: boolean;
}

export function AdjustBalanceSheet({
  visible,
  currentBalance,
  currency,
  onClose,
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

  // Seed the input from the current balance whenever the sheet opens.
  // (The legacy .show()/.hide() ref calls are gone — `visible` drives the Sheet.)
  useEffect(() => {
    if (visible) {
      initialize(currentBalance);
    }
  }, [visible, currentBalance, initialize]);

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
        <Button variant="secondary" label={Strings.adjustBalanceCancel} onPress={onClose} />
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
      visible={visible}
      onClose={onClose}
      title={Strings.adjustBalanceTitle}
      size="sm"
      footer={footer}
    >
      <Sheet.Body>
        <Box className="px-4 pt-2">
          <Text variant="hint" className="font-soraBold text-gold-500 pb-2 tracking-widest">
            {Strings.adjustBalanceLabel}
          </Text>
          <Box style={{ flexDirection: 'row' }} className="items-center gap-2">
            <View style={{ flex: 1 }}>
              <Input
                value={adjustState.input}
                onChangeText={(v) => {
                  setInput(v);
                  setError('');
                }}
                keyboardType="decimal-pad"
                isInvalid={!!adjustState.error}
              />
            </View>
            <Text variant="body" className="text-muted font-soraBold">
              {currency}
            </Text>
          </Box>
          {adjustState.error ? (
            <Text variant="caption" className="text-danger mt-1">
              {adjustState.error}
            </Text>
          ) : null}
        </Box>
      </Sheet.Body>
    </Sheet>
  );
}
