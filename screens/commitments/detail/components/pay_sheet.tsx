import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Input } from 'heroui-native';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Platform, Pressable, View } from 'react-native';

import { SHEET_FOOTER_CLEARANCE, Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { AccountPickerSheet } from '@/screens/transactions/transaction_form/components/account_picker_sheet';
import { ExchangeRateRow } from '@/screens/transactions/transaction_form/components/exchange_rate_row';
import { SaveCta } from '@/screens/transactions/transaction_form/components/save_cta';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';

import { usePaySheet } from './pay_sheet.hook';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

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

  const isAlreadyPaid =
    payment?.status === CommitmentPaymentStatus.Paid ||
    payment?.status === CommitmentPaymentStatus.Skipped;
  const isVariable = commitment?.amount_type === AmountType.Variable;

  const amountError = form.formState.errors.amount?.message;
  const accountError = form.formState.errors.account_id?.message;
  const rateError = form.formState.errors.exchange_rate?.message;

  const exchangeRateStr = state.exchangeRateValue != null ? String(state.exchangeRateValue) : '';
  const amountWatch = form.watch('amount');
  const paidDate = form.watch('paid_date');
  const convertedTotal =
    state.requiresRate && state.exchangeRateValue && state.exchangeRateValue > 0
      ? amountWatch * state.exchangeRateValue
      : undefined;

  const paidDateAsDate = paidDate ? new Date(paidDate + 'T00:00:00') : new Date();

  function openDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: paidDateAsDate,
        mode: 'date',
        onChange: (_, d) => {
          if (d) setPaidDate(toLocalDateString(d));
        },
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
        visible={state.visible}
        onClose={close}
        title={commitment ? Strings.commitmentsPayTitle(commitment.name) : ''}
        size="lg"
        footer={
          <SaveCta
            saving={state.saving || isAlreadyPaid}
            onPress={() => void onSubmit()}
            label={Strings.commitmentsPayConfirm}
          />
        }
      >
        <Sheet.Body>
          <BottomSheetScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: SHEET_FOOTER_CLEARANCE }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {payment ? (
              <Text className="font-inter text-muted mb-3 text-[12px]">
                {payment.due_date} · {payment.currency} ·{' '}
                {isVariable ? Strings.commitmentsAmountVariable : Strings.commitmentsAmountFixed}
              </Text>
            ) : null}

            {/* Amount */}
            <View className="mb-3 gap-1">
              <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
                {Strings.commitmentsPayAmount}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
                <View style={{ flex: 1 }}>
                  <Controller
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <Input
                        value={field.value > 0 ? String(field.value) : ''}
                        onChangeText={(v) => {
                          const parsed = parseFloat(v);
                          field.onChange(isNaN(parsed) ? 0 : parsed);
                        }}
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
                    <Text className="font-sora text-muted text-[15px] font-semibold">
                      {commitment.currency}
                    </Text>
                  </View>
                ) : null}
              </View>
              {amountError ? (
                <Text className="font-inter text-danger text-[11px]">{amountError}</Text>
              ) : null}
            </View>

            {/* Pay-from account */}
            <View className="mb-3 gap-1">
              <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
                {Strings.commitmentsPayAccount}
              </Text>
              <Pressable
                onPress={openAccountPicker}
                style={{ flexDirection: 'row', alignItems: 'center' }}
                className="bg-default border-border gap-2 rounded-md border px-3 py-3"
              >
                {state.selectedAccount ? (
                  <>
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: state.selectedAccount.color ?? CoreTokens.surfaceEl,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text className="font-sora text-foreground text-[15px] font-semibold">
                        {state.selectedAccount.name}
                      </Text>
                      <Text className="font-inter text-muted text-[12px]">
                        {numberFmt.format(state.selectedAccount.current_balance)}{' '}
                        {state.selectedAccount.currency}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text className="font-inter text-muted flex-1 text-[15px]">
                    {Strings.commitmentsPayAccount}
                  </Text>
                )}
                <MaterialCommunityIcons name="chevron-right" size={18} color={CoreTokens.text2} />
              </Pressable>
              {accountError ? (
                <Text className="font-inter text-danger text-[11px]">{accountError}</Text>
              ) : null}
            </View>

            {/* Exchange rate (conditional) */}
            {state.requiresRate ? (
              <ExchangeRateRow
                value={exchangeRateStr}
                onChange={(v) => {
                  const parsed = parseFloat(v);
                  form.setValue('exchange_rate', isNaN(parsed) ? undefined : parsed, {
                    shouldValidate: false,
                  });
                }}
                overrideEnabled={state.rateOverride}
                onToggleOverride={toggleRateOverride}
                rateUpdatedAt={state.rateUpdatedAt}
                amount={amountWatch || 0}
                error={rateError}
              />
            ) : null}

            {/* Converted total (conditional) */}
            {state.requiresRate && convertedTotal != null ? (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }} className="mt-2">
                <Text className="font-sora text-foreground text-[15px] font-semibold">
                  = {numberFmt.format(convertedTotal)} {state.selectedAccount?.currency}
                </Text>
              </View>
            ) : null}

            {/* Date — upgraded to date picker (OQ-2) */}
            <View className="mt-3 mb-3 gap-1">
              <Text className="font-inter text-muted text-[11px] tracking-wide uppercase">
                {Strings.commitmentsPayDate}
              </Text>
              <Pressable
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
              </Pressable>
              {Platform.OS === 'ios' && showIosDate ? (
                <DateTimePicker
                  value={paidDateAsDate}
                  mode="date"
                  display="spinner"
                  themeVariant="dark"
                  onChange={(_, d) => {
                    if (d) setPaidDate(toLocalDateString(d));
                  }}
                />
              ) : null}
            </View>

            {/* Notes */}
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
                    placeholder={Strings.commitmentsOptional}
                    multiline
                    numberOfLines={3}
                    style={{ minHeight: 72, textAlignVertical: 'top' }}
                  />
                )}
              />
            </View>
          </BottomSheetScrollView>
        </Sheet.Body>
      </Sheet>

      <AccountPickerSheet
        visible={state.accountPickerVisible}
        title={Strings.commitmentsPayAccount}
        accounts={state.accounts}
        selectedId={state.selectedAccount?.id}
        onSelect={selectAccount}
        onClose={closeAccountPicker}
      />
    </>
  );
}
