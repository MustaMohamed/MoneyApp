import { ControlField, Label, Typography } from 'heroui-native';
import React from 'react';
import { Controller, useFormState, useWatch, type UseFormReturn } from 'react-hook-form';

import { Box } from '@/components/ui/box';
import { FormLabelText } from '@/components/ui/form_label_text';
import { Input } from '@/components/ui/input';
import { Strings } from '@/constants/strings';
import { Spacing, Type } from '@/constants/theme';

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
  // useFormState, not form.formState — the same memoized-prop bailout
  // documented on account_form.tsx applies here (MA-007 round 2, D1).
  const { errors } = useFormState({ control });
  const interestTracking = useWatch({ control, name: 'interest_tracking' });

  return (
    <>
      <Box style={{ flexDirection: 'row', gap: Spacing.xs }}>
        <Box style={{ flex: 1 }}>
          <FormLabelText label={Strings.accountCreditLimitLabel} />
          <Controller
            control={control}
            name="credit_limit"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                isInvalid={!!errors.credit_limit}
              />
            )}
          />
          <FieldMessageRail
            helper={Strings.accountCreditLimitHelper}
            error={errors.credit_limit?.message}
          />
        </Box>
        <Box style={{ flex: 1 }}>
          <FormLabelText label={Strings.accountMinPaymentLabel} tag={Strings.fieldOptionalTag} />
          <Controller
            control={control}
            name="min_payment"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                isInvalid={!!errors.min_payment}
              />
            )}
          />
          <FieldMessageRail
            helper={Strings.accountMinPaymentHelper}
            error={errors.min_payment?.message}
          />
        </Box>
      </Box>

      <Box style={{ width: '50%' }}>
        <FormLabelText label={Strings.accountDueDayLabel} tag={Strings.fieldOptionalTag} />
        <Controller
          control={control}
          name="due_day"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={Strings.accountDueDayPlaceholder}
              keyboardType="number-pad"
              maxLength={2}
              isInvalid={!!errors.due_day}
            />
          )}
        />
        <FieldMessageRail helper={Strings.accountDueDayHelper} error={errors.due_day?.message} />
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
                  style={{ fontSize: Type.meta, lineHeight: Math.round(Type.meta * 1.3) }}
                >
                  {Strings.accountInterestLabel}
                </Label.Text>
              </Label>
              <Typography
                className="font-inter text-foreground"
                style={{ fontSize: Type.caption, lineHeight: Math.round(Type.caption * 1.35) }}
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
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.accountAprPlaceholder}
                keyboardType="decimal-pad"
                isInvalid={!!errors.apr}
              />
            )}
          />
          <FieldMessageRail helper={Strings.accountAprHelper} error={errors.apr?.message} />
        </Box>
      ) : null}
    </>
  );
}
