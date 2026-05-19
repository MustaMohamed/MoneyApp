import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Controller } from 'react-hook-form';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import ActionSheet, { ScrollView, type ActionSheetRef } from 'react-native-actions-sheet';

import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { AccountPickerSheet } from '@/screens/transactions/transaction_form/components/account_picker_sheet';
import { ExchangeRateRow } from '@/screens/transactions/transaction_form/components/exchange_rate_row';
import { ms } from '@/utils/responsive';

import { usePaySheet } from './pay_sheet.hook';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

interface Props {
  commitment: Commitment | undefined;
  payment: CommitmentPayment | undefined;
}

export function PaySheet({ commitment, payment }: Props) {
  const sheetRef = useRef<ActionSheetRef>(null);
  const { form, state, onSubmit, openAccountPicker, closeAccountPicker, selectAccount } =
    usePaySheet(commitment, payment);

  const isAlreadyPaid =
    payment?.status === CommitmentPaymentStatus.Paid ||
    payment?.status === CommitmentPaymentStatus.Skipped;

  useEffect(() => {
    if (state.visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [state.visible]);

  const amountError = form.formState.errors.amount?.message;
  const accountError = form.formState.errors.account_id?.message;
  const rateError = form.formState.errors.exchange_rate?.message;

  const isVariable = commitment?.amount_type === AmountType.Variable;

  const exchangeRateStr = state.exchangeRateValue != null ? String(state.exchangeRateValue) : '';

  const convertedTotal =
    state.requiresRate && state.exchangeRateValue && state.exchangeRateValue > 0
      ? form.watch('amount') * state.exchangeRateValue
      : undefined;

  return (
    <>
      <ActionSheet
        ref={sheetRef}
        gestureEnabled
        useBottomSafeAreaPadding={false}
        containerStyle={styles.sheet}
        indicatorStyle={styles.handle}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {commitment ? Strings.commitmentsPayTitle(commitment.name) : ''}
            </Text>
            {payment ? (
              <Text style={styles.headerSub}>
                {payment.due_date} · {payment.currency} ·{' '}
                {isVariable ? Strings.commitmentsAmountVariable : Strings.commitmentsAmountFixed}
              </Text>
            ) : null}
          </View>

          {/* Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>{Strings.commitmentsPayAmount}</Text>
            <View style={styles.amountRow}>
              <Controller
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <TextInput
                    style={[
                      styles.input,
                      styles.amountInput,
                      amountError ? styles.inputError : null,
                    ]}
                    value={field.value > 0 ? String(field.value) : ''}
                    onChangeText={(v) => {
                      const parsed = parseFloat(v);
                      field.onChange(isNaN(parsed) ? 0 : parsed);
                    }}
                    keyboardType="decimal-pad"
                    placeholder={isVariable ? Strings.commitmentsAmountPlaceholder : undefined}
                    placeholderTextColor={Colors.dark.text2}
                    returnKeyType="done"
                  />
                )}
              />
              {commitment ? (
                <View style={styles.currencyChip}>
                  <Text style={styles.currencyChipText}>{commitment.currency}</Text>
                </View>
              ) : null}
            </View>
            {amountError ? <Text style={styles.errText}>{amountError}</Text> : null}
          </View>

          {/* Account Picker Row */}
          <View style={styles.field}>
            <Text style={styles.label}>{Strings.commitmentsPayAccount}</Text>
            <Pressable
              style={({ pressed }) => [styles.pickerRow, pressed && styles.pressed]}
              onPress={openAccountPicker}
            >
              {state.selectedAccount ? (
                <View style={styles.pickerRowContent}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: state.selectedAccount.color ?? Colors.dark.surfaceEl },
                    ]}
                  />
                  <View style={styles.pickerInfo}>
                    <Text style={styles.pickerName}>{state.selectedAccount.name}</Text>
                    <Text style={styles.pickerBalance}>
                      {numberFmt.format(state.selectedAccount.current_balance)}{' '}
                      {state.selectedAccount.currency}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={ms(18)}
                    color={Colors.dark.text2}
                  />
                </View>
              ) : (
                <View style={styles.pickerRowContent}>
                  <Text style={styles.pickerPlaceholder}>{Strings.commitmentsPayAccount}</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={ms(18)}
                    color={Colors.dark.text2}
                  />
                </View>
              )}
            </Pressable>
            {accountError ? <Text style={styles.errText}>{accountError}</Text> : null}
          </View>

          {/* Exchange Rate (conditional) */}
          {state.requiresRate ? (
            <View style={styles.field}>
              <ExchangeRateRow
                value={exchangeRateStr}
                onChange={(v) => {
                  const parsed = parseFloat(v);
                  form.setValue('exchange_rate', isNaN(parsed) ? undefined : parsed, {
                    shouldValidate: false,
                  });
                }}
                overrideEnabled={true}
                onToggleOverride={() => {}}
                // V2 ExchangeRateRow added two required props in §7. Wire
                // them in here: amount comes from the form (so the live
                // EGP preview row renders alongside the rate input), and
                // rateUpdatedAt drives the "Rate may be stale" warning
                // when the stored rate is past the staleness window.
                rateUpdatedAt={state.rateUpdatedAt}
                amount={form.watch('amount') || 0}
                error={rateError}
              />
            </View>
          ) : null}

          {/* Converted Total (conditional) */}
          {state.requiresRate && convertedTotal != null ? (
            <View style={styles.convertedRow}>
              <Text style={styles.convertedLabel}>= </Text>
              <Text style={styles.convertedValue}>
                {numberFmt.format(convertedTotal)} {state.selectedAccount?.currency}
              </Text>
            </View>
          ) : null}

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.label}>{Strings.commitmentsPayDate}</Text>
            <Controller
              control={form.control}
              name="paid_date"
              render={({ field }) => (
                <TextInput
                  style={styles.input}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={Strings.commitmentDateInputFormat}
                  placeholderTextColor={Colors.dark.text2}
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="done"
                />
              )}
            />
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>{Strings.commitmentsPayNotes}</Text>
            <Controller
              control={form.control}
              name="notes"
              render={({ field }) => (
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  placeholder={Strings.commitmentsOptional}
                  placeholderTextColor={Colors.dark.text2}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}
            />
          </View>

          {/* CTA */}
          <View style={[styles.footer, (state.saving || isAlreadyPaid) && styles.ctaDisabled]}>
            <Pressable
              style={styles.ctaPress}
              onPress={onSubmit}
              disabled={state.saving || isAlreadyPaid}
            >
              <LinearGradient
                colors={[Colors.shared.cairoGold, Colors.dark.gold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Text style={styles.ctaLabel}>{Strings.commitmentsPayConfirm}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </ActionSheet>

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

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: {
    backgroundColor: Colors.dark.border,
    width: Size.sheetHandle.width,
    height: Size.sheetHandle.height,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    gap: ms(4),
  },
  headerTitle: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  headerSub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  field: {
    marginBottom: Spacing.sm,
    gap: Spacing.xxs,
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  inputError: {
    borderColor: Colors.dark.negative,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  amountInput: {
    flex: 1,
  },
  currencyChip: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyChipText: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  notesInput: {
    minHeight: ms(72),
    fontFamily: FontFamily.interRegular,
  },
  errText: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
  },
  pickerRow: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  pressed: { opacity: 0.7 },
  pickerRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: ms(12),
    height: ms(12),
    borderRadius: ms(6),
  },
  pickerInfo: { flex: 1 },
  pickerName: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  pickerBalance: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  pickerPlaceholder: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  convertedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  convertedLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  convertedValue: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text1,
  },
  footer: {
    marginTop: Spacing.sm,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaPress: {
    borderRadius: Radius.cta,
    overflow: 'hidden',
    height: Size.ctaHeight,
  },
  cta: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.cta,
  },
  ctaLabel: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
