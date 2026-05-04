import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { formatTime12h } from '@/utils/format_time_12h';
import { ExchangeRateRow } from './components/exchange_rate_row';
import { Numpad } from './components/numpad';
import { TypeTabs } from './components/type_tabs';
import { useTransactionFormBodyState } from './transaction_form_body.state';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';

function formatAmount(str: string): string {
  const [integer, decimal] = str.split('.');
  const formatted = new Intl.NumberFormat('en-US', { style: 'decimal' }).format(
    parseInt(integer || '0', 10),
  );
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
}

interface TransactionFormBodyProps {
  title: string;
  locked: boolean;
  type: TransactionType;
  onSelectType: (t: TransactionType) => void;
  amountStr: string;
  handleNumpad: (action: 'digit' | 'decimal' | 'backspace', value?: string) => void;
  amountError?: string;
  selectedAccount: Account | null;
  onOpenAccountPicker: () => void;
  accountError?: string;
  selectedToAccount: Account | null;
  onOpenToPicker: () => void;
  toAccountError?: string;
  selectedCategory: Category | null;
  onOpenCategoryPicker: () => void;
  categoryError?: string;
  isUSD: boolean;
  exchangeRate: string;
  setExchangeRate: (v: string) => void;
  rateOverride: boolean;
  toggleRateOverride: () => void;
  rateError?: string;
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  saving: boolean;
  onClose: () => void;
  handleSave: () => void;
}

export function TransactionFormBody({
  title,
  locked,
  type,
  onSelectType,
  amountStr,
  handleNumpad,
  amountError,
  selectedAccount,
  onOpenAccountPicker,
  accountError,
  selectedToAccount,
  onOpenToPicker,
  toAccountError,
  selectedCategory,
  onOpenCategoryPicker,
  categoryError,
  isUSD,
  exchangeRate,
  setExchangeRate,
  rateOverride,
  toggleRateOverride,
  rateError,
  date,
  setDate,
  time,
  setTime,
  note,
  setNote,
  saving,
  onClose,
  handleSave,
}: TransactionFormBodyProps) {
  const showIosDatePicker = useTransactionFormBodyState((s) => s.state.showIosDatePicker);
  const setShowIosDatePicker = useTransactionFormBodyState((s) => s.setShowIosDatePicker);
  const showIosTimePicker = useTransactionFormBodyState((s) => s.state.showIosTimePicker);
  const setShowIosTimePicker = useTransactionFormBodyState((s) => s.setShowIosTimePicker);
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  const dateAsDate = new Date(date + 'T' + time);
  const formattedDate = dateAsDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = formatTime12h(time);

  function openDatePicker() {
    setShowIosTimePicker(false);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dateAsDate,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (_, d) => {
          if (d) setDate(d.toISOString().slice(0, 10));
        },
      });
    } else {
      setShowIosDatePicker(!showIosDatePicker);
    }
  }

  function openTimePicker() {
    setShowIosDatePicker(false);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dateAsDate,
        mode: 'time',
        is24Hour: false,
        onChange: (_, d) => {
          if (d) {
            const hh = d.getHours().toString().padStart(2, '0');
            const mm = d.getMinutes().toString().padStart(2, '0');
            setTime(`${hh}:${mm}:00`);
          }
        },
      });
    } else {
      setShowIosTimePicker(!showIosTimePicker);
    }
  }

  const amountColor =
    type === TransactionType.Income
      ? Colors.dark.positive
      : type === TransactionType.Transfer
        ? '#4A9EE0'
        : type === TransactionType.CCPayment
          ? '#9B73D4'
          : Colors.dark.negative;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.kav}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={Size.iconMd} color={Colors.dark.text2} />
        </Pressable>
      </View>

      <TypeTabs active={type} onSelect={onSelectType} disabled={locked} />

      <View style={styles.amountRow}>
        <Text style={[styles.amountText, { color: amountColor }]}>{formatAmount(amountStr)}</Text>
      </View>
      {amountError ? <Text style={styles.amountErr}>{amountError}</Text> : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Account (from/single) */}
        {locked ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              {isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
            </Text>
            <View style={styles.fieldValue}>
              {selectedAccount && (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: selectedAccount.color ?? Colors.dark.border },
                  ]}
                />
              )}
              <Text style={styles.fieldValueText}>
                {selectedAccount?.name ??
                  (isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle)}
              </Text>
              <MaterialCommunityIcons name="lock-outline" size={ms(18)} color={Colors.dark.text2} />
            </View>
          </View>
        ) : (
          <Pressable style={styles.field} onPress={onOpenAccountPicker}>
            <Text style={styles.fieldLabel}>
              {isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
            </Text>
            <View style={styles.fieldValue}>
              {selectedAccount ? (
                <>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: selectedAccount.color ?? Colors.dark.border },
                    ]}
                  />
                  <Text style={styles.fieldValueText}>{selectedAccount.name}</Text>
                </>
              ) : (
                <Text style={styles.fieldPlaceholder}>
                  {isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle}
                </Text>
              )}
              <MaterialCommunityIcons
                name="chevron-right"
                size={ms(18)}
                color={Colors.dark.text2}
              />
            </View>
          </Pressable>
        )}
        {accountError ? <Text style={styles.err}>{accountError}</Text> : null}

        {/* To account */}
        {isTransferOrCC && (
          <>
            {locked ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{Strings.addTxToLabel}</Text>
                <View style={styles.fieldValue}>
                  {selectedToAccount && (
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: selectedToAccount.color ?? Colors.dark.border },
                      ]}
                    />
                  )}
                  <Text style={styles.fieldValueText}>
                    {selectedToAccount?.name ?? Strings.addTxPickToTitle}
                  </Text>
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={ms(18)}
                    color={Colors.dark.text2}
                  />
                </View>
              </View>
            ) : (
              <Pressable style={styles.field} onPress={onOpenToPicker}>
                <Text style={styles.fieldLabel}>{Strings.addTxToLabel}</Text>
                <View style={styles.fieldValue}>
                  {selectedToAccount ? (
                    <>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: selectedToAccount.color ?? Colors.dark.border },
                        ]}
                      />
                      <Text style={styles.fieldValueText}>{selectedToAccount.name}</Text>
                    </>
                  ) : (
                    <Text style={styles.fieldPlaceholder}>{Strings.addTxPickToTitle}</Text>
                  )}
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={ms(18)}
                    color={Colors.dark.text2}
                  />
                </View>
              </Pressable>
            )}
            {toAccountError ? <Text style={styles.err}>{toAccountError}</Text> : null}
          </>
        )}

        {/* Category */}
        {!isTransferOrCC && (
          <>
            <Pressable style={styles.field} onPress={onOpenCategoryPicker}>
              <Text style={styles.fieldLabel}>{Strings.addTxCategoryLabel}</Text>
              <View style={styles.fieldValue}>
                {selectedCategory ? (
                  <Text style={styles.fieldValueText}>{selectedCategory.name}</Text>
                ) : (
                  <Text style={styles.fieldPlaceholder}>{Strings.addTxPickCategoryTitle}</Text>
                )}
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={ms(18)}
                  color={Colors.dark.text2}
                />
              </View>
            </Pressable>
            {categoryError ? <Text style={styles.err}>{categoryError}</Text> : null}
          </>
        )}

        {isUSD && (
          <ExchangeRateRow
            value={exchangeRate}
            onChange={setExchangeRate}
            overrideEnabled={rateOverride}
            onToggleOverride={toggleRateOverride}
            error={rateError}
          />
        )}

        {/* Date + Time */}
        <View style={styles.dateTimeRow}>
          <Pressable style={[styles.field, styles.dateTimeField]} onPress={openDatePicker}>
            <Text style={styles.fieldLabel}>{Strings.addTxDateLabel}</Text>
            <View style={styles.fieldValue}>
              <Text style={styles.fieldValueText}>{formattedDate}</Text>
              <MaterialCommunityIcons name="calendar" size={ms(18)} color={Colors.dark.text2} />
            </View>
          </Pressable>
          <Pressable style={[styles.field, styles.dateTimeField]} onPress={openTimePicker}>
            <Text style={styles.fieldLabel}>{Strings.addTxTimeLabel}</Text>
            <View style={styles.fieldValue}>
              <Text style={styles.fieldValueText}>{formattedTime}</Text>
              <MaterialCommunityIcons
                name="clock-outline"
                size={ms(18)}
                color={Colors.dark.text2}
              />
            </View>
          </Pressable>
        </View>
        {showIosDatePicker && (
          <DateTimePicker
            value={dateAsDate}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            themeVariant="dark"
            onChange={(_, d) => {
              if (d) setDate(d.toISOString().slice(0, 10));
            }}
          />
        )}
        {showIosTimePicker && (
          <DateTimePicker
            value={dateAsDate}
            mode="time"
            display="spinner"
            themeVariant="dark"
            onChange={(_, d) => {
              if (d) {
                const hh = d.getHours().toString().padStart(2, '0');
                const mm = d.getMinutes().toString().padStart(2, '0');
                setTime(`${hh}:${mm}:00`);
              }
            }}
          />
        )}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{Strings.addTxNoteLabel}</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={Strings.addTxNotePlaceholder}
            placeholderTextColor={Colors.dark.text2}
          />
        </View>

        <Numpad onPress={handleNumpad} />
      </ScrollView>

      {/* CTA lives outside the ScrollView so it is always visible */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.ctaLabel}>{Strings.addTxSaveCta}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  handle: {
    width: ms(36),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.md },
  scrollContent: { gap: Spacing.sm, paddingBottom: Spacing.md, paddingTop: Spacing.xs },
  amountRow: { alignItems: 'center', paddingVertical: Spacing.sm },
  amountText: { fontFamily: FontFamily.soraExtra, fontSize: ms(40) },
  amountErr: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
    textAlign: 'center',
    marginTop: -Spacing.xs,
    marginBottom: Spacing.xxs,
    paddingHorizontal: Spacing.md,
  },
  field: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xxs,
  },
  fieldLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  fieldValue: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  fieldValueText: {
    flex: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  fieldPlaceholder: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  dot: { width: ms(10), height: ms(10), borderRadius: ms(5) },
  dateTimeRow: { flexDirection: 'row', gap: Spacing.sm },
  dateTimeField: { flex: 1 },
  noteInput: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingVertical: 0,
  },
  err: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
    marginTop: -Spacing.xxs,
  },
  footer: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.surface,
  },
  cta: {
    height: Size.ctaHeight,
    backgroundColor: Colors.shared.cairoGold,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.8 },
  ctaLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
