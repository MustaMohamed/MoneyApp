import { Input, PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { FormErrorText } from '@/components/ui/form_error_text';
import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';
import { formatAmount, formatRateDisplayMagnitude } from '@/utils/format_amount';
import { parseRateText } from '@/utils/parse_decimal';
import { ms } from '@/utils/responsive';

import { RATE_MESSAGE_SLOT_STYLE } from './transaction_form.geometry';

const STALE_THRESHOLD_DAYS = 30;
const RATE_PREVIEW_AMOUNT_DECIMALS = 2;
// Shown when the EGP value is not derivable yet; `previewHidden` removes the line instead.
const PREVIEW_PLACEHOLDER = '—';

function isStale(rateUpdatedAt: string | null): boolean {
  if (!rateUpdatedAt) return false;
  const updated = new Date(rateUpdatedAt).getTime();
  if (isNaN(updated)) return false;
  const ageMs = Date.now() - updated;
  return ageMs > STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}

// The card prints the rate as every rate prints; the editor's field keeps it as typed.
function formatCardRate(value: string): string {
  const rate = parseRateText(value);
  return rate === undefined ? value : formatRateDisplayMagnitude(rate).text;
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface SharedProps {
  value: string;
  overrideEnabled: boolean;
  onToggleOverride: () => void;
  rateUpdatedAt: string | null;
  /** Pre-resolved EGP amount; this row does no arithmetic. `undefined` shows the placeholder. */
  previewEgpAmount: number | undefined;
  /** Drop the preview line entirely; distinct from `previewEgpAmount` being absent. */
  previewHidden?: boolean;
  /** Subtitle saying why a rate is required for a payment that converts nothing. */
  purposeCaption?: string;
}

/** With `onOpenEditor` the card is a button in every state and the rate is typed in the editor, never on the card. */
type Props = SharedProps &
  (
    | { onOpenEditor: () => void; onChange?: never; error?: never }
    | { onOpenEditor?: never; onChange: (v: string) => void; error?: string }
  );

export function ExchangeRateRow({
  value,
  onChange,
  overrideEnabled,
  onToggleOverride,
  rateUpdatedAt,
  previewEgpAmount,
  previewHidden = false,
  purposeCaption,
  error,
  onOpenEditor,
}: Props): React.ReactElement {
  const stale = isStale(rateUpdatedAt);
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const showsInput = overrideEnabled && onOpenEditor === undefined;

  const subtitle = overrideEnabled
    ? Strings.addTxRateSourceCustom
    : rateUpdatedAt
      ? `${Strings.addTxRateSourceStored} · ${Strings.addTxRateLastUpdated.replace('{date}', formatDateShort(rateUpdatedAt))}`
      : Strings.addTxRateSourceStored;

  return (
    <View className="border-accent/30 bg-accent/10 mt-3 rounded-md border px-3 py-3">
      <PressableFeedback
        testID="exchange-rate-row"
        onPress={onOpenEditor ?? (overrideEnabled ? undefined : onToggleOverride)}
        accessibilityRole={showsInput ? undefined : 'button'}
        accessibilityLabel={showsInput ? '' : Strings.addTxRateEditAccessibility}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flex: 1 }}>
          <Text
            className="font-sora-semibold text-foreground"
            style={{ fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
          >
            {Strings.currencyRateLabel}
          </Text>
          {purposeCaption ? (
            <Text
              className="font-inter text-muted mt-0.5"
              style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
            >
              {purposeCaption}
            </Text>
          ) : null}
          <Text
            className="font-inter text-muted mt-0.5"
            style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
          >
            {subtitle}
          </Text>
          {stale ? (
            <Text
              className="font-inter text-warning mt-0.5"
              style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
            >
              {Strings.addTxRateStale}
            </Text>
          ) : null}
        </View>
        {showsInput ? (
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
            style={{ fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) }}
          >
            {onOpenEditor === undefined ? value : formatCardRate(value)}
          </Text>
        )}
      </PressableFeedback>

      {previewHidden ? null : (
        <Text
          className="font-inter text-muted mt-2"
          style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
        >
          {Strings.addTxEgpPreview.replace(
            '{amount}',
            previewEgpAmount === undefined
              ? PREVIEW_PLACEHOLDER
              : formatAmount(previewEgpAmount, RATE_PREVIEW_AMOUNT_DECIMALS),
          )}
        </Text>
      )}

      <View style={{ minHeight: ms(20) }} className="mt-1 items-end justify-center">
        {overrideEnabled ? (
          <PressableFeedback
            onPress={onToggleOverride}
            accessibilityRole="button"
            accessibilityLabel={Strings.addTxRateResetAccessibility}
          >
            <Text
              className="font-inter text-accent"
              style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
            >
              {Strings.addTxRateReset}
            </Text>
          </PressableFeedback>
        ) : null}
      </View>

      <View
        testID="exchange-rate-error-slot"
        style={RATE_MESSAGE_SLOT_STYLE}
        accessibilityLiveRegion="polite"
      >
        <FormErrorText
          message={error}
          disableAnimation
          style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
        />
      </View>
    </View>
  );
}
