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
  // Only `selected_type` is watched at this level — the balance label and
  // the credit slot's content both derive from it, so this component has to
  // re-render when it changes. Everything else that used to live here (a
  // whole-form `useFormState({ control })` feeding every field's `errors`
  // and `isInvalid`, plus `useWatch('currency')` for the balance suffix) was
  // removed for debt:perf #227 / MA-009 quality review Q1: subscribing this
  // component to either one re-rendered it — and everything under it,
  // including the five-tile type grid, which reads neither — on every
  // currency tap and every validation transition. Each `Controller` below
  // now reads its own `fieldState.invalid` (react-hook-form's own narrowly-
  // scoped per-field subscription — no extra hook call, `useController`
  // already does this internally), each `FieldMessageRail` owns its own
  // `useFormState({ control, name })`, and the balance suffix owns its own
  // `useWatch('currency')` — the useFormState-not-form.formState invariant
  // (still load-bearing under the React Compiler) now lives at every leaf
  // instead of once at this root, narrower rather than gone.
  const selectedType = useWatch({ control, name: 'selected_type' });
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

      {/* Balance + currency row — flex 1.5 / 1 (spec.md:75) via CURRENCY_CELL_WIDTH */}
      <Box className="pt-1" style={{ flexDirection: 'row', gap: Spacing.xs }}>
        <Box style={{ flex: 1 }}>
          {/* `label` named, never `{...balanceField}`: the model also carries
              `helper`, which belongs to the rail below and which JSX spread
              would pass here silently — TypeScript does not excess-check
              spread attributes, so the day FormLabelText gains a `helper`
              prop the copy starts rendering twice with no call-site edit. */}
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
          {/* Neither helper nor an error that ever fires — the rail still
              mounts, holding C1's blank message row, which is what keeps
              the two-column row's baselines level. */}
          <FieldMessageRail control={control} name="currency" />
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
        <FieldMessageRail
          control={control}
          name="selected_color"
          helper={Strings.accountColorHelper}
        />
      </Box>

      {/* Reserved credit slot — always mounted, decision 3 */}
      <Box className="pt-1">
        <CreditCardSlot form={form} isCreditCard={isCreditCard} />
      </Box>
    </>
  );
}
