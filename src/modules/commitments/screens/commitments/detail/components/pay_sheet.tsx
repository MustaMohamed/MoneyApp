import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Input, PressableFeedback } from 'heroui-native';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Platform, View } from 'react-native';

import { TYPE_OPTIONS } from '@/components/account_type_pill';
import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import { AccountPickerSheet } from '@/modules/accounts/components/account_picker_sheet';
import { ExchangeRateRow } from '@/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row';
import { formatCurrencyAmount } from '@/utils/format_amount';
import { formatLongDate, formatShortDate, toLocalDateString } from '@/utils/format_date';
import { ms } from '@/utils/responsive';

import type { Commitment } from '../../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../../entities/commitment_payment.entity';
import { usePaySheet } from './pay_sheet.hook';

interface Props {
  commitment: Commitment | undefined;
  payment: CommitmentPayment | undefined;
}

export function PaySheet({ commitment, payment }: Props) {
  const {
    form,
    state,
    onSubmit,
    openAccountPicker,
    closeAccountPicker,
    selectAccount,
    setVisible,
    toggleRateOverride,
    setPaidDate,
  } = usePaySheet(commitment, payment);

  const [showIosDate, setShowIosDate] = useState(false);
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  const isAlreadyPaid =
    payment?.status === CommitmentPaymentStatus.Paid ||
    payment?.status === CommitmentPaymentStatus.Skipped;
  const isVariable = commitment?.amount_type === AmountType.Variable;

  // The RHF error wins the slot; the live flag is the only source of it before a submit.
  const amountError =
    form.formState.errors.amountText?.message ??
    (state.convertedBelowMin && state.selectedAccount
      ? Strings.commitmentsPayErrConvertedBelowMin(state.selectedAccount.currency)
      : undefined);
  const accountError = form.formState.errors.account_id?.message;
  const rateError = form.formState.errors.exchange_rate?.message;
  // Read during render; reading inside the `onChange` below sees the previous render's value.
  const isSubmitted = form.formState.isSubmitted;

  const paidDate = form.watch('paid_date');

  const paidDateAsDate = paidDate ? new Date(paidDate + 'T00:00:00') : new Date();

  function openDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: paidDateAsDate,
        mode: 'date',
        onValueChange: (_, d) => setPaidDate(toLocalDateString(d)),
      });
    } else {
      setShowIosDate((v) => !v);
    }
  }

  function close() {
    setVisible(false);
  }

  return (
    <>
      <Sheet
        isOpen={state.visible}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={commitment ? Strings.commitmentsPayTitle(commitment.name) : ''}
        size="lg"
        scrollable
        footer={
          <>
            {state.saveError ? (
              <Text className="font-inter text-danger text-[11px]">
                {Strings.commitmentsPayError}
              </Text>
            ) : null}
            <Button
              variant="primary"
              label={Strings.commitmentsPayConfirm}
              isLoading={state.saving}
              isDisabled={state.saving || isAlreadyPaid}
              onPress={() => void onSubmit()}
            />
          </>
        }
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: SHEET_FOOTER_CLEARANCE }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {payment ? (
            <Text className="font-inter text-muted mb-3 text-[12px]">
              {formatShortDate(payment.due_date)} · {payment.currency} ·{' '}
              {isVariable ? Strings.commitmentsAmountVariable : Strings.commitmentsAmountFixed}
            </Text>
          ) : null}

          <View className="mb-3 gap-1">
            <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
              {Strings.commitmentsPayAmount}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
              <View style={{ flex: 1 }}>
                <Controller
                  control={form.control}
                  name="amountText"
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChangeText={field.onChange}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      keyboardType="decimal-pad"
                      placeholder={isVariable ? Strings.commitmentsAmountPlaceholder : undefined}
                      isInvalid={!!amountError}
                      returnKeyType="done"
                    />
                  )}
                />
              </View>
              {commitment ? (
                <View className="bg-default border-border rounded-md border px-3 py-2">
                  <Text className="font-sora-semibold text-muted text-[15px]">
                    {commitment.currency}
                  </Text>
                </View>
              ) : null}
            </View>
            {amountError ? (
              <Text className="font-inter text-danger text-[11px]">{amountError}</Text>
            ) : null}
          </View>

          <View className="mb-3 gap-1">
            <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
              {Strings.commitmentsPayAccount}
            </Text>
            <PressableFeedback
              onPress={openAccountPicker}
              style={{ flexDirection: 'row', alignItems: 'center' }}
              className="bg-default border-border gap-2 rounded-md border px-3 py-3"
            >
              {state.selectedAccount ? (
                <>
                  <MaterialCommunityIcons
                    name={
                      TYPE_OPTIONS.find((o) => o.type === state.selectedAccount?.type)?.icon ??
                      'bank'
                    }
                    size={ms(18)}
                    color={state.selectedAccount.color ?? CoreTokens.text2}
                  />
                  <View style={{ flex: 1 }}>
                    <Text className="font-sora-semibold text-foreground text-[15px]">
                      {state.selectedAccount.name}
                    </Text>
                    <Text className="font-inter text-muted text-[12px]">
                      {formatCurrencyAmount(
                        state.selectedAccount.current_balance,
                        state.selectedAccount.currency,
                      )}
                    </Text>
                  </View>
                </>
              ) : (
                <Text className="font-inter text-muted flex-1 text-[15px]">
                  {Strings.commitmentsPayAccount}
                </Text>
              )}
              <MaterialCommunityIcons name="chevron-right" size={18} color={CoreTokens.text2} />
            </PressableFeedback>
            {accountError ? (
              <Text className="font-inter text-danger text-[11px]">{accountError}</Text>
            ) : null}
          </View>

          {state.requiresRate ? (
            <ExchangeRateRow
              value={state.exchangeRateValue ?? ''}
              // Pinned false keeps a stale error; pinned true validates before any submit.
              onChange={(v) => form.setValue('exchange_rate', v, { shouldValidate: isSubmitted })}
              overrideEnabled={state.rateOverride}
              onToggleOverride={toggleRateOverride}
              rateUpdatedAt={state.rateUpdatedAt}
              previewEgpAmount={state.previewEgpAmount}
              previewHidden={state.previewHidden}
              purposeCaption={state.purposeCaption}
              error={rateError}
            />
          ) : null}

          {/* Converted total: decimals come from CURRENCY_CONFIG, with no override. */}
          {state.convertedTotal ? (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }} className="mt-2">
              <Text className="font-sora-semibold text-foreground text-[15px]">
                = {formatCurrencyAmount(state.convertedTotal.amount, state.convertedTotal.currency)}
              </Text>
            </View>
          ) : null}

          <View className="mt-3 mb-3 gap-1">
            <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
              {Strings.commitmentsPayDate}
            </Text>
            <PressableFeedback
              onPress={openDatePicker}
              style={{ flexDirection: 'row', alignItems: 'center' }}
              className="bg-default border-border gap-2 rounded-md border px-3 py-3"
            >
              <Text
                className={
                  paidDate
                    ? 'font-sora text-foreground flex-1 text-[15px]'
                    : 'font-inter text-muted flex-1 text-[15px]'
                }
              >
                {paidDate ? formatLongDate(paidDate) : Strings.commitmentsPayDatePlaceholder}
              </Text>
              <MaterialCommunityIcons name="calendar" size={18} color={CoreTokens.text2} />
            </PressableFeedback>
            {Platform.OS === 'ios' && showIosDate ? (
              <DateTimePicker
                value={paidDateAsDate}
                mode="date"
                display="spinner"
                themeVariant="dark"
                onValueChange={(_, d) => setPaidDate(toLocalDateString(d))}
              />
            ) : null}
          </View>

          <View className="mb-3 gap-1">
            <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
              {Strings.commitmentsPayNotes}
            </Text>
            <Controller
              control={form.control}
              name="notes"
              render={({ field }) => (
                <Input
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder={Strings.commitmentsOptional}
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 72, textAlignVertical: 'top' }}
                />
              )}
            />
          </View>
        </BottomSheetScrollView>
      </Sheet>

      <AccountPickerSheet
        isOpen={state.accountPickerVisible}
        title={Strings.commitmentsPayAccount}
        accounts={state.accounts}
        selectedId={state.selectedAccount?.id}
        onSelect={selectAccount}
        onOpenChange={closeAccountPicker}
      />
    </>
  );
}
