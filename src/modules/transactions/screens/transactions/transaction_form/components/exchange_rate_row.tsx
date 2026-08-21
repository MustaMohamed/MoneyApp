// modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row.tsx
import { Input, PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { FormErrorText } from '@/components/ui/form_error_text';
import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Type } from '@/constants/theme';
import { formatAmount } from '@/utils/format_amount';
import { roundMoney } from '@/utils/money';
import { parsePositiveDecimal } from '@/utils/parse_decimal';
import { ms } from '@/utils/responsive';

const STALE_THRESHOLD_DAYS = 30;
const RATE_PREVIEW_AMOUNT_DECIMALS = 2;

function isStale(rateUpdatedAt: string | null): boolean {
  if (!rateUpdatedAt) return false;
  const updated = new Date(rateUpdatedAt).getTime();
  if (isNaN(updated)) return false;
  const ageMs = Date.now() - updated;
  return ageMs > STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}

function formatPreviewAmount(amount: number, rateStr: string): string {
  const rate = parsePositiveDecimal(rateStr);
  if (rate === undefined) return '—';
  const egp = roundMoney(amount * rate);
  return formatAmount(egp, RATE_PREVIEW_AMOUNT_DECIMALS);
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  overrideEnabled: boolean;
  onToggleOverride: () => void;
  rateUpdatedAt: string | null;
  amount: number;
  error?: string;
}

export function ExchangeRateRow({
  value,
  onChange,
  overrideEnabled,
  onToggleOverride,
  rateUpdatedAt,
  amount,
  error,
}: Props): React.ReactElement {
  const stale = isStale(rateUpdatedAt);
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  const subtitle = overrideEnabled
    ? Strings.addTxRateSourceCustom
    : rateUpdatedAt
      ? `${Strings.addTxRateSourceStored} · ${Strings.addTxRateLastUpdated.replace('{date}', formatDateShort(rateUpdatedAt))}`
      : Strings.addTxRateSourceStored;

  return (
    <View className="border-accent/30 bg-accent/10 mt-3 rounded-md border px-3 py-3">
      <PressableFeedback
        testID="exchange-rate-row"
        onPress={overrideEnabled ? undefined : onToggleOverride}
        accessibilityRole={overrideEnabled ? undefined : 'button'}
        accessibilityLabel={overrideEnabled ? undefined : Strings.addTxRateEditAccessibility}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-sora-semibold text-foreground" style={{ fontSize: Type.body }}>
            {Strings.currencyRateLabel}
          </Text>
          <Text className="font-inter text-muted mt-0.5" style={{ fontSize: Type.micro }}>
            {subtitle}
          </Text>
          {stale ? (
            <Text className="font-inter text-warning mt-0.5" style={{ fontSize: Type.micro }}>
              {Strings.addTxRateStale}
            </Text>
          ) : null}
        </View>
        {overrideEnabled ? (
          <View style={{ width: 100 }}>
            <Input
              testID="exchange-rate-input"
              value={value}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              placeholder={Strings.addTxRatePlaceholder}
              accessibilityLabel={Strings.addTxRateInputAccessibility}
              isInvalid={error !== undefined}
              onFocus={onFocus}
              onBlur={onBlur}
              variant="secondary"
            />
          </View>
        ) : (
          <Text
            className="font-sora-semibold text-foreground"
            style={{ fontSize: Type.bodyStrong }}
          >
            {value}
          </Text>
        )}
      </PressableFeedback>

      <Text className="font-inter text-muted mt-2" style={{ fontSize: Type.caption }}>
        {Strings.addTxEgpPreview.replace('{amount}', formatPreviewAmount(amount, value))}
      </Text>

      <View style={{ minHeight: ms(20) }} className="mt-1 items-end justify-center">
        {overrideEnabled ? (
          <PressableFeedback
            onPress={onToggleOverride}
            accessibilityRole="button"
            accessibilityLabel={Strings.addTxRateResetAccessibility}
          >
            <Text className="font-inter text-accent" style={{ fontSize: Type.caption }}>
              {Strings.addTxRateReset}
            </Text>
          </PressableFeedback>
        ) : null}
      </View>

      <View
        testID="exchange-rate-error-slot"
        style={{ minHeight: ms(16) }}
        className="justify-center"
        accessibilityLiveRegion="polite"
      >
        <FormErrorText
          message={error}
          numberOfLines={1}
          disableAnimation
          style={{ fontSize: Type.micro }}
        />
      </View>
    </View>
  );
}
