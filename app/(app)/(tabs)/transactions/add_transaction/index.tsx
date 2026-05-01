import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect } from 'react';
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
import Animated from 'react-native-reanimated';

import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { useAddTransactionAnim } from './add_transaction.anim';
import { useAddTransaction } from './add_transaction.hook';
import { AccountPickerSheet } from './components/account_picker_sheet';
import { CategoryPickerSheet } from './components/category_picker_sheet';
import { ExchangeRateRow } from './components/exchange_rate_row';
import { Numpad } from './components/numpad';
import { TypeTabs } from './components/type_tabs';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function formatAmount(str: string): string {
  const [integer, decimal] = str.split('.');
  const formatted = new Intl.NumberFormat('en-US', { style: 'decimal' }).format(
    parseInt(integer || '0', 10),
  );
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
}

export function AddTransactionSheet({ visible, onClose }: Props) {
  const { sheetStyle, overlayStyle, openSheet, closeSheet } = useAddTransactionAnim();

  const hook = useAddTransaction(() => closeSheet(onClose));

  const isTransferOrCC =
    hook.type === TransactionType.Transfer || hook.type === TransactionType.CCPayment;

  useEffect(() => {
    if (visible) openSheet();
  }, [visible]);

  if (!visible) return null;

  const amountColor =
    hook.type === TransactionType.Income
      ? Colors.dark.positive
      : hook.type === TransactionType.Transfer
        ? '#4A9EE0'
        : hook.type === TransactionType.CCPayment
          ? '#9B73D4'
          : Colors.dark.negative;

  return (
    <>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet(onClose)} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Handle + header */}
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{Strings.addTxTitle}</Text>
            <Pressable onPress={() => closeSheet(onClose)} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={Size.iconMd} color={Colors.dark.text2} />
            </Pressable>
          </View>

          {/* Type tabs */}
          <TypeTabs active={hook.type} onSelect={hook.setType} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Amount display */}
            <View style={styles.amountRow}>
              <Text style={[styles.amountText, { color: amountColor }]}>
                {formatAmount(hook.amountStr)}
              </Text>
            </View>
            {hook.errors.amount ? <Text style={styles.err}>{hook.errors.amount}</Text> : null}

            {/* Account picker */}
            <Pressable style={styles.field} onPress={() => hook.setShowAccountPicker(true)}>
              <Text style={styles.fieldLabel}>
                {isTransferOrCC ? Strings.addTxFromLabel : Strings.addTxAccountLabel}
              </Text>
              <View style={styles.fieldValue}>
                {hook.selectedAccount ? (
                  <>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: hook.selectedAccount.color ?? Colors.dark.border },
                      ]}
                    />
                    <Text style={styles.fieldValueText}>{hook.selectedAccount.name}</Text>
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
            {hook.errors.account ? <Text style={styles.err}>{hook.errors.account}</Text> : null}

            {/* To account (transfer/cc) */}
            {isTransferOrCC && (
              <>
                <Pressable style={styles.field} onPress={() => hook.setShowToPicker(true)}>
                  <Text style={styles.fieldLabel}>{Strings.addTxToLabel}</Text>
                  <View style={styles.fieldValue}>
                    {hook.selectedToAccount ? (
                      <>
                        <View
                          style={[
                            styles.dot,
                            {
                              backgroundColor: hook.selectedToAccount.color ?? Colors.dark.border,
                            },
                          ]}
                        />
                        <Text style={styles.fieldValueText}>{hook.selectedToAccount.name}</Text>
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
                {hook.errors.toAccount ? (
                  <Text style={styles.err}>{hook.errors.toAccount}</Text>
                ) : null}
              </>
            )}

            {/* Category (expense/income) */}
            {!isTransferOrCC && (
              <>
                <Pressable style={styles.field} onPress={() => hook.setShowCategoryPicker(true)}>
                  <Text style={styles.fieldLabel}>{Strings.addTxCategoryLabel}</Text>
                  <View style={styles.fieldValue}>
                    {hook.selectedCategory ? (
                      <Text style={styles.fieldValueText}>{hook.selectedCategory.name}</Text>
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
                {hook.errors.category ? (
                  <Text style={styles.err}>{hook.errors.category}</Text>
                ) : null}
              </>
            )}

            {/* Exchange rate (USD accounts only) */}
            {hook.isUSD && (
              <ExchangeRateRow
                value={hook.exchangeRate}
                onChange={hook.setExchangeRate}
                error={hook.errors.rate}
              />
            )}

            {/* Note */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{Strings.addTxNoteLabel}</Text>
              <TextInput
                style={[styles.noteInput]}
                value={hook.note}
                onChangeText={hook.setNote}
                placeholder={Strings.addTxNotePlaceholder}
                placeholderTextColor={Colors.dark.text2}
              />
            </View>

            {/* Numpad */}
            <Numpad onPress={hook.handleNumpad} />

            {/* Save CTA */}
            <Pressable
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              onPress={hook.handleSave}
              disabled={hook.saving}
            >
              <Text style={styles.ctaLabel}>{Strings.addTxSaveCta}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Account picker modal */}
        <AccountPickerSheet
          visible={hook.showAccountPicker}
          title={isTransferOrCC ? Strings.addTxPickFromTitle : Strings.addTxPickAccountTitle}
          accounts={hook.accounts}
          selectedId={hook.accountId}
          onSelect={hook.selectAccount}
          onClose={() => hook.setShowAccountPicker(false)}
        />

        {/* To account picker modal */}
        <AccountPickerSheet
          visible={hook.showToPicker}
          title={Strings.addTxPickToTitle}
          accounts={hook.accounts}
          selectedId={hook.toAccountId}
          excludeId={hook.accountId}
          onSelect={hook.selectToAccount}
          onClose={() => hook.setShowToPicker(false)}
        />

        {/* Category picker modal */}
        <CategoryPickerSheet
          visible={hook.showCategoryPicker}
          title={Strings.addTxPickCategoryTitle}
          categories={hook.visibleCategories}
          selectedId={hook.categoryId}
          onSelect={hook.selectCategory}
          onClose={() => hook.setShowCategoryPicker(false)}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    zIndex: 11,
    maxHeight: '92%',
  },
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
  scroll: { paddingHorizontal: Spacing.md },
  scrollContent: { gap: Spacing.sm, paddingBottom: Spacing.xxl },
  amountRow: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  amountText: {
    fontFamily: FontFamily.soraExtra,
    fontSize: ms(40),
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
  fieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
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
  dot: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
  },
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
