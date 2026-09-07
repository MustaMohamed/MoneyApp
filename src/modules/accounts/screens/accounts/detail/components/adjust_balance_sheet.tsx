import { Typography } from 'heroui-native';
import React, { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { FormErrorText } from '@/components/ui/form_error_text';
import { FormSectionLabel } from '@/components/ui/form_section_label';
import { Input } from '@/components/ui/input';
import { Sheet, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';
import { formatCurrencyAmount } from '@/utils/format_amount';

import {
  FIELD_MESSAGE_RAIL_STYLE,
  FIELD_MESSAGE_TEXT_LINE_HEIGHT,
} from '../../../../components/account_form/account_form.geometry';
import { parseAdjustInput } from './adjust_balance_sheet.helpers';
import { useAdjustBalanceSheetState } from './adjust_balance_sheet.state';

interface AdjustBalanceSheetProps {
  isOpen: boolean;
  currentBalance: number;
  currency: Currency;
  onOpenChange: (open: boolean) => void;
  // Promise-returning on purpose: `handleSave` awaits and catches, so rejections surface here.
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
    // Clear the parse error before the write so a save failure replaces it.
    setError('');
    try {
      await onSave(result.value);
    } catch {
      // The `await` above is load-bearing; without it the rejection escapes this try.
      setError(Strings.adjustBalanceSaveError);
    }
  };

  const footer = (
    <Box style={{ flexDirection: 'row' }} className="gap-2">
      <Box style={{ flex: 1 }}>
        <Button
          variant="secondary"
          flat
          label={Strings.adjustBalanceCancel}
          onPress={() => onOpenChange(false)}
        />
      </Box>
      <Box style={{ flex: 2 }}>
        <Button
          variant="primary"
          flat
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
        <Box style={{ flexDirection: 'row' }} className="items-center justify-between pb-3">
          <Typography
            className="text-foreground/55 font-inter"
            style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
          >
            {Strings.accountDetailBalance}
          </Typography>
          <Typography
            className="text-foreground font-sora-semibold tabular-nums"
            style={{ fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) }}
          >
            {formatCurrencyAmount(currentBalance, currency)}
          </Typography>
        </Box>
        <FormSectionLabel>{Strings.adjustBalanceLabel}</FormSectionLabel>
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
          suffix={
            <Typography className="text-muted font-sora-bold text-[15px]">{currency}</Typography>
          }
        />
        {/* One track for helper and error, announced live; `FieldMessageRail` is RHF-bound and this sheet is not, so the shape is reused, not the component. */}
        <Box style={FIELD_MESSAGE_RAIL_STYLE} accessibilityLiveRegion="polite">
          {error ? (
            <FormErrorText
              message={error}
              disableAnimation
              style={{ fontSize: Type.detail, lineHeight: FIELD_MESSAGE_TEXT_LINE_HEIGHT }}
            />
          ) : (
            // Not HeroUI `Description`: it paints `--color-muted` and this copy must stay readable.
            <Typography
              className="font-inter text-foreground"
              style={{ fontSize: Type.detail, lineHeight: FIELD_MESSAGE_TEXT_LINE_HEIGHT }}
            >
              {Strings.adjustBalanceHelper}
            </Typography>
          )}
        </Box>
      </Box>
    </Sheet>
  );
}
