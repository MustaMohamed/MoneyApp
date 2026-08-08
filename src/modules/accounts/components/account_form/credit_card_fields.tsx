import { Switch, Typography } from 'heroui-native';
import React from 'react';
import { Controller, useFormState, useWatch, type UseFormReturn } from 'react-hook-form';
import Animated from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { FormErrorText } from '@/components/ui/form_error_text';
import { FormSectionLabel } from '@/components/ui/form_section_label';
import { Input } from '@/components/ui/input';
import { Strings } from '@/constants/strings';

import type { AddAccountFormData } from '../../utils/add_account.schema';
import { useCreditCardFieldsAnim } from './account_form.anim';

export interface CreditCardFieldsProps {
  form: UseFormReturn<AddAccountFormData>;
}

/**
 * The credit-card-only block — moved verbatim from
 * screens/accounts/add_account/index.tsx:119-229. Its own file because
 * spec.md:448 reserves it and MA-009 rebuilds precisely this block; keeping
 * it separate means MA-009's diff does not touch account_form.tsx.
 */
export function CreditCardFields({ form }: CreditCardFieldsProps) {
  const { control } = form;
  // useFormState, not form.formState — see account_form.tsx's comment; the
  // same memoized-prop bailout applies here (MA-007 round 2, D1).
  const { errors } = useFormState({ control });
  const { aprEntering, aprExiting } = useCreditCardFieldsAnim();
  const interestTracking = useWatch({ control, name: 'interest_tracking' });

  return (
    <>
      {/* Revolving Balance */}
      <Box className="pt-1">
        <FormSectionLabel>{Strings.o4SectionRevolving}</FormSectionLabel>
        <Controller
          control={control}
          name="revolving_balance"
          render={({ field: { value, onChange } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              placeholder={Strings.o4RevolvingPlaceholder}
              keyboardType="decimal-pad"
            />
          )}
        />
      </Box>

      {/* Credit Limit */}
      <Box className="pt-1">
        <FormSectionLabel>{Strings.o4SectionLimit}</FormSectionLabel>
        <Controller
          control={control}
          name="credit_limit"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={Strings.o4CreditLimitPlaceholder}
              keyboardType="decimal-pad"
              isInvalid={!!errors.credit_limit}
            />
          )}
        />
        <FormErrorText message={errors.credit_limit?.message} />
      </Box>

      {/* Min Payment */}
      <Box className="pt-1">
        <FormSectionLabel>{Strings.o4SectionMinPayment}</FormSectionLabel>
        <Controller
          control={control}
          name="min_payment"
          render={({ field: { value, onChange } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              placeholder={Strings.o4MinPaymentPlaceholder}
              keyboardType="decimal-pad"
            />
          )}
        />
        <Typography className="text-muted font-inter mt-1 text-[11px]">
          {Strings.o4MinPaymentHint}
        </Typography>
      </Box>

      {/* Due Day */}
      <Box className="pt-1">
        <FormSectionLabel>{Strings.o4SectionDueDay}</FormSectionLabel>
        <Controller
          control={control}
          name="due_day"
          render={({ field: { value, onChange } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              placeholder={Strings.o4DueDayPlaceholder}
              keyboardType="number-pad"
              maxLength={2}
            />
          )}
        />
      </Box>

      {/* Interest Tracking */}
      <Box style={{ flexDirection: 'row' }} className="items-center justify-between py-3">
        <Typography className="font-inter-semibold text-foreground text-[15px]">
          {Strings.o4InterestLabel}
        </Typography>
        <Switch
          isSelected={interestTracking}
          onSelectedChange={(v) => form.setValue('interest_tracking', v)}
          accessibilityLabel={Strings.o4InterestLabel}
        />
      </Box>

      {/* APR (when interest tracking ON) */}
      {interestTracking && (
        <Animated.View entering={aprEntering} exiting={aprExiting} className="pt-1">
          <FormSectionLabel>{Strings.o4SectionApr}</FormSectionLabel>
          <Controller
            control={control}
            name="apr"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.o4AprPlaceholder}
                keyboardType="decimal-pad"
                isInvalid={!!errors.apr}
              />
            )}
          />
          <Typography className="text-muted font-inter mt-1 text-[11px]">
            {Strings.o4AprHint}
          </Typography>
          <FormErrorText message={errors.apr?.message} />
        </Animated.View>
      )}
    </>
  );
}
