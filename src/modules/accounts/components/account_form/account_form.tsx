import React from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';

import { Box } from '@/components/ui/box';
import { FormLabelText } from '@/components/ui/form_label_text';
import { Input } from '@/components/ui/input';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Spacing } from '@/constants/theme';
import { CurrencySelector } from '@/modules/currency';

import type { AddAccountFormData } from '../../utils/add_account.schema';
import { AccountColorField } from './account_color_field';
import {
  CURRENCY_CELL_WIDTH,
  CURRENCY_SEGMENT_WIDTH,
  resolveBalanceField,
} from './account_form.geometry';
import { AccountTypeSelector } from './account_type_selector';
import { BalanceCurrencySuffix } from './balance_currency_suffix';
import { CreditCardSlot } from './credit_card_slot';
import { FieldMessageRail } from './field_message_rail';

export interface AccountFormProps {
  form: UseFormReturn<AddAccountFormData>;
  /** Keys the one open slot in `account_color_sheet.state.ts`; each host passes its own id. */
  ownerId: string;
}

/** Fields only; the host owns the header, the CTA and the scroll container. */
export function AccountForm({ form, ownerId }: AccountFormProps) {
  const { control } = form;
  // Watch only `selected_type` here; a whole-form subscription re-renders every field below.
  const selectedType = useWatch({ control, name: 'selected_type' });
  const isCreditCard = selectedType === AccountType.CreditCard;
  const balanceField = resolveBalanceField(selectedType);

  return (
    <>
      <FormLabelText label={Strings.accountTypeLabel} />
      <AccountTypeSelector form={form} />

      <Box className="pt-1">
        <FormLabelText label={Strings.accountNameLabel} />
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur }, fieldState }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={Strings.accountNamePlaceholder}
              maxLength={30}
              isInvalid={fieldState.invalid}
            />
          )}
        />
        <FieldMessageRail control={control} name="name" helper={Strings.accountNameHelper} />
      </Box>

      {/* Balance and currency row, a 1.5 / 1 width split via `CURRENCY_CELL_WIDTH` */}
      <Box className="pt-1" style={{ flexDirection: 'row', gap: Spacing.xs }}>
        <Box style={{ flex: 1 }}>
          {/* Pass `label` only; spreading `balanceField` would also pass `helper` unchecked. */}
          <FormLabelText label={balanceField.label} numberOfLines={1} />
          <Controller
            control={control}
            name="balance"
            render={({ field: { value, onChange, onBlur }, fieldState }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.accountBalancePlaceholder}
                keyboardType="decimal-pad"
                isInvalid={fieldState.invalid}
                suffix={<BalanceCurrencySuffix control={control} />}
              />
            )}
          />
          <FieldMessageRail control={control} name="balance" helper={balanceField.helper} />
        </Box>
        <Box style={{ width: CURRENCY_CELL_WIDTH }}>
          <FormLabelText label={Strings.accountCurrencyLabel} />
          {/* Height sits here, not on the column; the column would crush the label and rail. */}
          <Box style={{ height: Size.fieldHeight, justifyContent: 'center' }}>
            <Controller
              control={control}
              name="currency"
              render={({ field: { value, onChange } }) => (
                <CurrencySelector
                  value={value}
                  onChange={onChange}
                  segmentWidth={CURRENCY_SEGMENT_WIDTH}
                />
              )}
            />
          </Box>
          {/* Empty rail keeps the two columns' baselines level. */}
          <FieldMessageRail control={control} name="currency" />
        </Box>
      </Box>

      <Box className="pt-1">
        <Controller
          control={control}
          name="selected_color"
          render={({ field: { value, onChange } }) => (
            <AccountColorField ownerId={ownerId} value={value} onChange={onChange} />
          )}
        />
        <FieldMessageRail
          control={control}
          name="selected_color"
          helper={Strings.accountColorHelper}
        />
      </Box>

      {/* Mounted for every type, so the slot's origin does not shift when the type changes */}
      <Box className="pt-1">
        <CreditCardSlot form={form} isCreditCard={isCreditCard} />
      </Box>
    </>
  );
}
