import { ControlField, Label, Typography } from 'heroui-native';
import React from 'react';
import { Controller, useWatch, type Control, type UseFormReturn } from 'react-hook-form';

import { Box } from '@/components/ui/box';
import { FormLabelText } from '@/components/ui/form_label_text';
import { Input } from '@/components/ui/input';
import { CURRENCY_CONFIG } from '@/constants/currency';
import type { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

import type { CreditFieldValues } from '../../utils/credit_fields.schema';
import { FieldMessageRail } from './field_message_rail';

export interface CreditCardFieldsProps<T extends CreditFieldValues> {
  form: UseFormReturn<T>;
  /** Suffixes the two money fields with its code and APR with `%`. */
  currency?: Currency;
  /** Drops the limit, minimum and APR helpers and reserves their error lines instead. */
  hideHelpers?: boolean;
}

/** `InputGroup.Suffix` does not auto-wrap children; a bare string crashes without `Typography`. */
function FieldSuffix({ text }: { text: string }) {
  return (
    <Typography
      className="font-sora text-content-secondary"
      style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
    >
      {text}
    </Typography>
  );
}

export function CreditCardFields<T extends CreditFieldValues>({
  form,
  currency,
  hideHelpers,
}: CreditCardFieldsProps<T>) {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- T extends CreditFieldValues, so every field name this file uses exists on the form
  const control = form.control as unknown as Control<CreditFieldValues>;
  const interestTracking = useWatch({ control, name: 'interest_tracking' });
  const moneySuffix = currency ? <FieldSuffix text={CURRENCY_CONFIG[currency].code} /> : undefined;
  const aprSuffix = currency ? <FieldSuffix text={Strings.accountAprSuffix} /> : undefined;
  // Credit limit faults wrap to two lines in a half-width cell; APR faults fit one at full width.
  const moneyReserve = hideHelpers ? 2 : undefined;
  const aprReserve = hideHelpers ? 1 : undefined;

  return (
    <>
      <Box style={{ flexDirection: 'row', gap: Spacing.xs }}>
        <Box style={{ flex: 1 }}>
          <FormLabelText label={Strings.accountCreditLimitLabel} />
          <Controller
            control={control}
            name="credit_limit"
            render={({ field: { value, onChange, onBlur }, fieldState }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                isInvalid={fieldState.invalid}
                accessibilityLabel={Strings.accountCreditLimitLabel}
                suffix={moneySuffix}
              />
            )}
          />
          <FieldMessageRail
            control={control}
            name="credit_limit"
            helper={hideHelpers ? undefined : Strings.accountCreditLimitHelper}
            reserveErrorLines={moneyReserve}
          />
        </Box>
        <Box style={{ flex: 1 }}>
          <FormLabelText label={Strings.accountMinPaymentLabel} tag={Strings.fieldOptionalTag} />
          <Controller
            control={control}
            name="min_payment"
            render={({ field: { value, onChange, onBlur }, fieldState }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                isInvalid={fieldState.invalid}
                accessibilityLabel={Strings.accountMinPaymentLabel}
                suffix={moneySuffix}
              />
            )}
          />
          <FieldMessageRail
            control={control}
            name="min_payment"
            helper={hideHelpers ? undefined : Strings.accountMinPaymentHelper}
            reserveErrorLines={moneyReserve}
          />
        </Box>
      </Box>

      {/* An empty second cell, not `width: '50%'`: two `flex: 1` cells share `W - gap`. */}
      <Box style={{ flexDirection: 'row', gap: Spacing.xs }}>
        <Box style={{ flex: 1 }}>
          <FormLabelText label={Strings.accountDueDayLabel} tag={Strings.fieldOptionalTag} />
          <Controller
            control={control}
            name="due_day"
            render={({ field: { value, onChange, onBlur }, fieldState }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.accountDueDayPlaceholder}
                keyboardType="number-pad"
                maxLength={2}
                isInvalid={fieldState.invalid}
                accessibilityLabel={Strings.accountDueDayLabel}
              />
            )}
          />
          <FieldMessageRail control={control} name="due_day" helper={Strings.accountDueDayHelper} />
        </Box>
        <Box style={{ flex: 1 }} />
      </Box>

      <Controller
        control={control}
        name="interest_tracking"
        render={({ field: { value, onChange } }) => (
          <ControlField isSelected={value} onSelectedChange={onChange}>
            <Box style={{ flex: 1 }}>
              <Label>
                <Label.Text
                  className="font-inter-semibold"
                  style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
                >
                  {Strings.accountInterestLabel}
                </Label.Text>
              </Label>
              <Typography
                className="font-inter text-foreground"
                style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
              >
                {Strings.accountInterestHelper}
              </Typography>
            </Box>
            <ControlField.Indicator />
          </ControlField>
        )}
      />

      {interestTracking ? (
        <Box>
          <FormLabelText label={Strings.accountAprLabel} />
          <Controller
            control={control}
            name="apr"
            render={({ field: { value, onChange, onBlur }, fieldState }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.accountAprPlaceholder}
                keyboardType="decimal-pad"
                isInvalid={fieldState.invalid}
                accessibilityLabel={Strings.accountAprLabel}
                suffix={aprSuffix}
              />
            )}
          />
          <FieldMessageRail
            control={control}
            name="apr"
            helper={hideHelpers ? undefined : Strings.accountAprHelper}
            reserveErrorLines={aprReserve}
          />
        </Box>
      ) : null}
    </>
  );
}
