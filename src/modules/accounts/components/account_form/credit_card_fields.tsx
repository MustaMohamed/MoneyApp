import { ControlField, Label, Typography } from 'heroui-native';
import React from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';

import { Box } from '@/components/ui/box';
import { FormLabelText } from '@/components/ui/form_label_text';
import { Input } from '@/components/ui/input';
import { Strings } from '@/constants/strings';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

import type { AddAccountFormData } from '../../utils/add_account.schema';
import { FieldMessageRail } from './field_message_rail';

export interface CreditCardFieldsProps {
  form: UseFormReturn<AddAccountFormData>;
}

/**
 * The credit-card-only fields — CreditCardSlot's open-state body (mockup
 * C5/C6). No entering animation on the APR reveal (MA-009 plan decision 11
 * — the scope's three-animation motion budget has no room for it): it
 * renders inside this same, already-mounted block, so the block only grows
 * downward and the header/rails/CTA above it never move.
 *
 * The "Adds an APR field…" caption is plain `Typography` at
 * `--foreground`, not HeroUI `Description` — decision 8 rules out
 * `Description` for any helper copy in this task, because
 * `description.css` paints `--color-muted` (2.36:1, decorative-only per
 * spec.md:120), and this caption is something a user must read, not a
 * genuinely redundant label.
 */
export function CreditCardFields({ form }: CreditCardFieldsProps) {
  const { control } = form;
  // Only interest_tracking is watched here — it decides whether the APR
  // field mounts at all. Each Controller below reads its own
  // `fieldState.invalid` and each FieldMessageRail owns its own
  // `useFormState({ control, name })`, instead of this component threading
  // a whole-form `errors` object down to every field (debt:perf #227 /
  // MA-009 quality review Q1 — the same fix as account_form.tsx's).
  const interestTracking = useWatch({ control, name: 'interest_tracking' });

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
              />
            )}
          />
          <FieldMessageRail
            control={control}
            name="credit_limit"
            helper={Strings.accountCreditLimitHelper}
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
              />
            )}
          />
          <FieldMessageRail
            control={control}
            name="min_payment"
            helper={Strings.accountMinPaymentHelper}
          />
        </Box>
      </Box>

      {/* Half width, but the same half the row above uses: two `flex: 1`
          cells share `W - gap`, so a bare `width: '50%'` is `gap/2` wider
          than the credit-limit column and its right edge overhangs it. The
          empty second cell reproduces the row's own arithmetic instead of
          approximating it. No box metrics on the pad (unlike the type
          grid's) — neither cell here carries padding or a border, so both
          resolve `flexBasis: 0` against the same content box. */}
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
              />
            )}
          />
          <FieldMessageRail control={control} name="apr" helper={Strings.accountAprHelper} />
        </Box>
      ) : null}
    </>
  );
}
