import React from 'react';
import { Controller, useFormState, useWatch, type UseFormReturn } from 'react-hook-form';
import Animated from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { FormErrorText } from '@/components/ui/form_error_text';
import { FormSectionLabel } from '@/components/ui/form_section_label';
import { Input } from '@/components/ui/input';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CurrencySelector } from '@/modules/currency';

import type { AddAccountFormData } from '../../utils/add_account.schema';
import { TYPE_OPTIONS, TypePill } from '../account_type_pill';
import { AccountColorField } from './account_color_field';
import { useAccountFormAnim } from './account_form.anim';
import { CreditCardFields } from './credit_card_fields';

export interface AccountFormProps {
  form: UseFormReturn<AddAccountFormData>;
  /**
   * Keys this form's colour sheet. account_color_sheet.state.ts stores one
   * open slot keyed by owner precisely because MA-007/MA-008 add consumers
   * (its own header comment, lines 8-11; .claude/rules/state.md rule 5,
   * audit L27). Settings passes 'accounts/add_account'; MA-008 passes
   * 'onboarding/add_account'.
   */
  ownerId: string;
}

/**
 * The account form's fields — moved verbatim from
 * screens/accounts/add_account/index.tsx:43-231. No header, no CTA, no
 * scroll container: the host owns all three, because onboarding's scroll
 * view lives inside OnboardingShell's viewport.
 */
export function AccountForm({ form, ownerId }: AccountFormProps) {
  const { control } = form;
  // useFormState subscribes this component directly to formState changes.
  // Reading `form.formState.errors` off the prop instead reads a stable
  // useRef whose identity never changes — with the React Compiler on
  // (app.json's experiments.reactCompiler), the host's cached element skips
  // re-rendering this subtree on a validation change and every field error
  // renders as invisible until an unrelated re-render happens to catch up.
  const { errors } = useFormState({ control });
  const { ccEntering, ccExiting } = useAccountFormAnim();
  const selectedType = useWatch({ control, name: 'selected_type' });
  const selectedCurrency = useWatch({ control, name: 'currency' });
  const isCreditCard = selectedType === AccountType.CreditCard;

  return (
    <>
      {/* Account Type */}
      <FormSectionLabel>{Strings.o4SectionType}</FormSectionLabel>
      <Box style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <TypePill
            key={opt.type}
            option={opt}
            isSelected={selectedType === opt.type}
            onSelect={() => form.setValue('selected_type', opt.type, { shouldValidate: true })}
          />
        ))}
      </Box>

      {/* Account Name */}
      <Box className="pt-1">
        <FormSectionLabel>{Strings.o4SectionName}</FormSectionLabel>
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={Strings.o4NamePlaceholder}
              maxLength={30}
              isInvalid={!!errors.name}
            />
          )}
        />
        <FormErrorText message={errors.name?.message} />
      </Box>

      {/* Currency */}
      <Box className="pt-1">
        <FormSectionLabel>{Strings.o4SectionCurrency}</FormSectionLabel>
        <CurrencySelector value={selectedCurrency} onChange={(c) => form.setValue('currency', c)} />
      </Box>

      {/* Balance */}
      <Box className="pt-1">
        <FormSectionLabel>{Strings.o4SectionBalance}</FormSectionLabel>
        <Controller
          control={control}
          name="balance"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={Strings.o4BalancePlaceholder}
              keyboardType="decimal-pad"
              isInvalid={!!errors.balance}
            />
          )}
        />
        <FormErrorText message={errors.balance?.message} />
      </Box>

      {/* Color picker */}
      <Box className="pt-1">
        <Controller
          control={control}
          name="selected_color"
          render={({ field: { value, onChange } }) => (
            <AccountColorField ownerId={ownerId} value={value} onChange={onChange} />
          )}
        />
      </Box>

      {/* CC conditional fields */}
      {isCreditCard && (
        <Animated.View entering={ccEntering} exiting={ccExiting} className="pt-1">
          <CreditCardFields form={form} />
        </Animated.View>
      )}
    </>
  );
}
