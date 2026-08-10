import { Typography } from 'heroui-native';
import React from 'react';
import { Controller, useFormState, useWatch, type UseFormReturn } from 'react-hook-form';

import { Box } from '@/components/ui/box';
import { FormLabelText } from '@/components/ui/form_label_text';
import { Input } from '@/components/ui/input';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Spacing, Type } from '@/constants/theme';
import { CurrencySelector } from '@/modules/currency';

import type { AddAccountFormData } from '../../utils/add_account.schema';
import { AccountColorField } from './account_color_field';
import {
  CURRENCY_CELL_WIDTH,
  CURRENCY_SEGMENT_WIDTH,
  resolveBalanceField,
} from './account_form.geometry';
import { AccountTypeSelector } from './account_type_selector';
import { CreditCardSlot } from './credit_card_slot';
import { FieldMessageRail } from './field_message_rail';

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
 * The redesigned account form's fields (mockup § C, C1-C6). No header, no
 * CTA, no scroll container: the host owns all three, because onboarding's
 * scroll view lives inside OnboardingShell's viewport.
 *
 * Child order is unconditional top to bottom — the credit slot (plan
 * decision 3) is the only node whose *content* varies with the selected
 * type; every node above it is present and identically shaped for every
 * type (the balance field is relabelled, never replaced), which is what
 * makes the slot's origin stable across a type switch (S2's zero-shift
 * claim, checked on the emulator by diffing `mqa find` bounds).
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
  const selectedType = useWatch({ control, name: 'selected_type' });
  const selectedCurrency = useWatch({ control, name: 'currency' });
  const isCreditCard = selectedType === AccountType.CreditCard;
  const balanceField = resolveBalanceField(selectedType);

  return (
    <>
      {/* Account type */}
      <FormLabelText label={Strings.accountTypeLabel} />
      <AccountTypeSelector form={form} />

      {/* Account name */}
      <Box className="pt-1">
        <FormLabelText label={Strings.accountNameLabel} />
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={Strings.accountNamePlaceholder}
              maxLength={30}
              isInvalid={!!errors.name}
            />
          )}
        />
        <FieldMessageRail helper={Strings.accountNameHelper} error={errors.name?.message} />
      </Box>

      {/* Balance + currency row — flex 1.5 / 1 (spec.md:75) via CURRENCY_CELL_WIDTH */}
      <Box className="pt-1" style={{ flexDirection: 'row', gap: Spacing.xs }}>
        <Box style={{ flex: 1 }}>
          <FormLabelText {...balanceField} numberOfLines={1} />
          <Controller
            control={control}
            name="balance"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.accountBalancePlaceholder}
                keyboardType="decimal-pad"
                isInvalid={!!errors.balance}
                suffix={
                  // A bare string throws "Text strings must be rendered
                  // within a <Text> component" — InputGroup.Suffix does not
                  // auto-wrap its children (confirmed on the emulator).
                  // Muted, not full-strength: this echoes the currency
                  // segment selected one cell over, so it is genuinely
                  // redundant rather than something a user must read here
                  // (decision 8's own carve-out for redundant labels).
                  <Typography
                    className="font-sora text-content-secondary"
                    style={{ fontSize: Type.meta, lineHeight: Math.round(Type.meta * 1.3) }}
                  >
                    {selectedCurrency}
                  </Typography>
                }
              />
            )}
          />
          <FieldMessageRail helper={balanceField.helper} error={errors.balance?.message} />
        </Box>
        <Box style={{ width: CURRENCY_CELL_WIDTH }}>
          <FormLabelText label={Strings.accountCurrencyA11y} />
          {/* The fixed height belongs on this wrapper, not the whole
              column: SegmentedTabs' own rendered height does not exactly
              equal Size.fieldHeight, so centering it inside a
              Size.fieldHeight box is what lines the control up with the
              balance Input beside it. Sizing the outer column itself to
              Size.fieldHeight would compress the label+selector+rail stack
              into 48pt and spill it into the row above (caught on the
              emulator, not by a unit test). */}
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
          {/* Neither helper nor error — the rail still mounts, holding C1's
              blank message row, which is what keeps the two-column row's
              baselines level with the balance cell beside it. */}
          <FieldMessageRail />
        </Box>
      </Box>

      {/* Colour */}
      <Box className="pt-1">
        <Controller
          control={control}
          name="selected_color"
          render={({ field: { value, onChange } }) => (
            <AccountColorField ownerId={ownerId} value={value} onChange={onChange} />
          )}
        />
        <FieldMessageRail helper={Strings.accountColorHelper} />
      </Box>

      {/* Reserved credit slot — always mounted, decision 3 */}
      <Box className="pt-1">
        <CreditCardSlot form={form} isCreditCard={isCreditCard} />
      </Box>
    </>
  );
}
