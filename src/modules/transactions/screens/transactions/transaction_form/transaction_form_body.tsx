import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Input, Spinner } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import { TYPE_OPTIONS } from '@/components/account_type_pill';
import { AccountColorTile } from '@/components/ui/account_color_tile';
import { AccountStrip } from '@/components/ui/account_strip';
import { DangerRing } from '@/components/ui/danger_ring';
import { DateRow } from '@/components/ui/date_row';
import { FactRow } from '@/components/ui/fact_row';
import { FormPickerRow } from '@/components/ui/form_picker_row';
import { ACCOUNT_STRIP_WRAPPER_PADDING_Y } from '@/components/ui/form_sheet.geometry';
import type { AccountStripChip } from '@/components/ui/form_sheet.helpers';
import { INPUT_NO_FOCUS_BORDER_COLOR } from '@/components/ui/input';
import { ListCard } from '@/components/ui/list_card';
import { RateRow } from '@/components/ui/rate_row';
import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import {
  resolveOneLineTextProps,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { ValidationSlot } from '@/components/ui/validation_slot';
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { resolveAccountGlyphColor } from '@/modules/accounts/constants/account_glyph_color';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import { isRateStale } from '@/modules/currency/store/currency.helpers';
import { toIconName } from '@/utils/icon_name_guard';

import { TransactionAmountHero } from './components/transaction_amount_hero';
import {
  resolveNoteInputGeometry,
  TRANSACTION_FORM_CONTENT_CONTAINER_STYLE,
} from './components/transaction_form.geometry';
import {
  TransactionConvertedAmountLine,
  TransactionRateEditor,
} from './components/transaction_rate_preview';
import type { RatePreviewInput } from './components/transaction_rate_preview.hook';
import { TypeTabs } from './components/type_tabs';
import { resolveBudgetFieldError, resolveToRowFace } from './transaction_form.helpers';
import type { TransactionFormMode } from './transaction_form.types';
import { useTransactionFormNoteReveal } from './transaction_form_note_reveal.hook';

interface BaseProps {
  datePickerOwnerId: string;
  formMode: TransactionFormMode;
  type: TransactionType;
  typeLabel: string;
  typeSupportingText: string;
  onSelectType: (t: TransactionType) => void;
  setAmountStr: (v: string) => void;
  amountError?: string;
  selectedAccount: Account | null;
  accountError?: string;
  selectedToAccount: Account | null;
  onOpenToPicker: () => void;
  toAccountError?: string;
  selectedCategory: Category | null;
  onOpenCategoryPicker: () => void;
  categoryError?: string;
  showBudgetField: boolean;
  selectedBudget: Budget | null;
  budgetsLoading: boolean;
  budgetLookupError?: string;
  onOpenBudgetPicker: () => void;
  onRetryBudgetLookup: () => void;
  budgetError?: string;
  /** The rate demand flag (either side USD), not the source currency. */
  requiresRate: boolean;
  exchangeRate: string;
  /** The rate editor's Done; `false` keeps the editor open with its message. */
  commitExchangeRate: (text: string) => boolean;
  rateUpdatedAt: string | null;
  /** The currency store's rate, not the transaction's own `exchangeRate`. */
  storedRate: number;
  date: string;
  setDate: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  currency: Currency;
}

type Props = BaseProps &
  (
    | { locked: true; lockedChips: AccountStripChip[] }
    | { locked: false; stripChips: AccountStripChip[]; onSelectStripChip: (id: string) => void }
  );

// Canvas `.fact`: 16 inset, a hairline under every fact but the last (Note).
const FACT_CELL_CLASS = 'border-separator border-b px-4';

export function TransactionFormBody(props: Props): React.ReactElement {
  const {
    datePickerOwnerId,
    formMode,
    locked,
    type,
    typeLabel,
    typeSupportingText,
    onSelectType,
    setAmountStr,
    amountError,
    selectedAccount,
    accountError,
    selectedToAccount,
    onOpenToPicker,
    toAccountError,
    selectedCategory,
    onOpenCategoryPicker,
    categoryError,
    showBudgetField,
    selectedBudget,
    budgetsLoading,
    budgetLookupError,
    onOpenBudgetPicker,
    onRetryBudgetLookup,
    budgetError,
    requiresRate,
    exchangeRate,
    commitExchangeRate,
    rateUpdatedAt,
    storedRate,
    date,
    setDate,
    note,
    setNote,
    currency,
  } = props;
  const { onFocus: onInputFocus, onBlur: onInputBlur } = useBottomSheetAwareHandlers();
  const { scrollRef, handleScrollLayout, handleNoteFocus, handleNoteBlur } =
    useTransactionFormNoteReveal();
  const handleNoteInputFocus: typeof onInputFocus = (event) => {
    onInputFocus(event);
    handleNoteFocus();
  };
  const handleNoteInputBlur: typeof onInputBlur = (event) => {
    onInputBlur(event);
    handleNoteBlur();
  };

  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const budgetFieldError = resolveBudgetFieldError(budgetError, budgetLookupError);
  const stripCaption = isTransferOrCC ? Strings.addTxFromLabel : undefined;
  const toRowFace = resolveToRowFace({ locked, account: selectedToAccount ?? undefined });
  const { fontScale } = useWindowDimensions();
  const supportingLine = resolveOneLineTextProps(scaledTextStyleAboveOne(Type.micro, fontScale));
  const noteGeometry = resolveNoteInputGeometry(fontScale);
  const ratePreview: RatePreviewInput = {
    mode: formMode,
    type,
    sourceCurrency: selectedAccount?.currency,
    destinationCurrency: selectedToAccount?.currency,
  };
  const rateStale = isRateStale(rateUpdatedAt, Date.now());

  return (
    <BottomSheetScrollView
      ref={scrollRef}
      testID="transaction-form-scroll"
      style={{ flex: 1 }}
      onLayout={handleScrollLayout}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TypeTabs
        active={type}
        incomeLabel={type === TransactionType.Income ? typeLabel : Strings.addTxTypeIncome}
        onSelect={onSelectType}
        isDisabled={locked}
      />
      <View className="min-h-8 justify-center px-4 py-1.5">
        <Text
          className="font-inter text-muted"
          {...supportingLine}
          style={{
            fontSize: Type.micro,
            lineHeight: lineHeightFor(Type.micro),
            ...supportingLine.style,
          }}
        >
          {typeSupportingText}
        </Text>
      </View>
      <View
        className="border-separator border-b"
        style={{ paddingVertical: ACCOUNT_STRIP_WRAPPER_PADDING_Y }}
      >
        {props.locked ? (
          <AccountStrip chips={props.lockedChips} revealKey={type} caption={stripCaption} />
        ) : (
          <AccountStrip
            chips={props.stripChips}
            revealKey={type}
            onSelect={props.onSelectStripChip}
            caption={stripCaption}
            error={accountError}
            emptyText={
              type === TransactionType.Transfer
                ? Strings.addTxErrTransferNoCc
                : type === TransactionType.CCPayment
                  ? Strings.addTxErrCcPaymentSourceMustBeAsset
                  : undefined
            }
          />
        )}
      </View>

      <TransactionAmountHero
        onChange={setAmountStr}
        type={type}
        currency={currency}
        mode={formMode}
        invalid={amountError !== undefined}
      />
      <ValidationSlot
        testID="amount-error-slot"
        liveTestID="amount-error-live"
        message={amountError}
      >
        {requiresRate && amountError === undefined ? (
          <TransactionConvertedAmountLine {...ratePreview} exchangeRate={exchangeRate} />
        ) : null}
      </ValidationSlot>

      <View testID="transaction-form-fact-inset" style={TRANSACTION_FORM_CONTENT_CONTAINER_STYLE}>
        <ListCard testID="transaction-form-fact-group">
          {isTransferOrCC ? (
            <View className={FACT_CELL_CLASS}>
              <FormPickerRow
                testID="to-account-row"
                divider={false}
                onPress={locked ? undefined : onOpenToPicker}
                disabled={locked}
                label={Strings.addTxToLabel}
                accessibilityHint={toAccountError}
                value={toRowFace.value}
                prefix={
                  toRowFace.tile !== undefined ? (
                    <AccountColorTile
                      color={toRowFace.tile.color}
                      type={toRowFace.tile.type}
                      size={Size.dualTile}
                      glyphSize={Size.rowGlyph}
                      hollow={toRowFace.tile.hollow}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name={
                        selectedToAccount
                          ? (TYPE_OPTIONS.find((option) => option.type === selectedToAccount.type)
                              ?.icon ?? 'bank')
                          : 'bank-outline'
                      }
                      size={Size.iconXs}
                      color={resolveAccountGlyphColor(selectedToAccount?.color)}
                    />
                  )
                }
                suffix={
                  <MaterialCommunityIcons
                    name={locked ? 'lock-outline' : 'chevron-right'}
                    size={Size.iconSm}
                    color={CoreTokens.text2}
                  />
                }
              />
              {toAccountError !== undefined ? <DangerRing testID="to-account-ring" /> : null}
            </View>
          ) : null}

          {!isTransferOrCC ? (
            <View className={FACT_CELL_CLASS}>
              <FormPickerRow
                testID="category-row"
                divider={false}
                onPress={onOpenCategoryPicker}
                label={Strings.addTxCategoryLabel}
                accessibilityHint={categoryError}
                value={selectedCategory?.name ?? Strings.addTxPickCategoryTitle}
                prefix={
                  <MaterialCommunityIcons
                    name={
                      selectedCategory ? toIconName(selectedCategory.icon, 'tag') : 'tag-outline'
                    }
                    size={Size.filterSegmentIcon}
                    color={selectedCategory?.color ?? CoreTokens.text1}
                  />
                }
                suffix={
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={Size.iconSm}
                    color={CoreTokens.text2}
                  />
                }
              />
              {categoryError !== undefined ? <DangerRing testID="category-ring" /> : null}
            </View>
          ) : null}

          {showBudgetField ? (
            <View className={FACT_CELL_CLASS}>
              <FormPickerRow
                testID="budget-row"
                divider={false}
                onPress={
                  budgetsLoading
                    ? undefined
                    : budgetLookupError
                      ? onRetryBudgetLookup
                      : onOpenBudgetPicker
                }
                disabled={budgetsLoading}
                accessibilityLabel={
                  budgetLookupError ? Strings.addTxBudgetRetryA11y : Strings.addTxBudgetLabel
                }
                accessibilityHint={budgetFieldError}
                label={Strings.addTxBudgetLabel}
                value={
                  budgetsLoading
                    ? Strings.addTxBudgetLoading
                    : (budgetLookupError ?? selectedBudget?.name ?? Strings.addTxPickBudgetTitle)
                }
                wrapsValue={budgetLookupError !== undefined}
                valueClassName={budgetLookupError ? 'font-inter-medium text-danger' : undefined}
                valueFontSize={budgetLookupError ? Type.caption : undefined}
                prefix={
                  <MaterialCommunityIcons
                    name="wallet-outline"
                    size={Size.filterSegmentIcon}
                    color={CoreTokens.text2}
                  />
                }
                suffix={
                  budgetsLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <MaterialCommunityIcons
                      name={budgetLookupError ? 'reload' : 'chevron-right'}
                      size={Size.iconSm}
                      color={CoreTokens.text2}
                    />
                  )
                }
              />
              {budgetFieldError !== undefined ? <DangerRing testID="budget-ring" /> : null}
            </View>
          ) : null}

          {requiresRate ? (
            <View className={FACT_CELL_CLASS}>
              <RateRow ownerId={datePickerOwnerId} value={exchangeRate} stale={rateStale} />
            </View>
          ) : null}

          <View className={FACT_CELL_CLASS}>
            <DateRow ownerId={datePickerOwnerId} value={date} onChange={setDate} divider={false} />
          </View>

          <FactRow testID="note-row" label={Strings.addTxNoteLabel} showDivider={false}>
            <Input
              value={note}
              onChangeText={setNote}
              placeholder={Strings.addTxNotePlaceholder}
              placeholderTextColor={CoreTokens.text2}
              onFocus={handleNoteInputFocus}
              onBlur={handleNoteInputBlur}
              // Android: a single-line edit text keeps the parent's touch lock, so a drag that starts on it never scrolls the form.
              multiline
              allowFontScaling={noteGeometry.text === undefined}
              submitBehavior="blurAndSubmit"
              variant="secondary"
              className="font-sora text-foreground rounded-none border-0 bg-transparent p-0 tabular-nums"
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: noteGeometry.minHeight,
                textAlign: 'right',
                borderColor: INPUT_NO_FOCUS_BORDER_COLOR,
                fontSize: Type.body,
                lineHeight: lineHeightFor(Type.body),
                ...noteGeometry.text,
              }}
            />
          </FactRow>
        </ListCard>
      </View>
      <TransactionRateEditor
        ownerId={datePickerOwnerId}
        value={exchangeRate}
        onCommit={commitExchangeRate}
        storedRate={storedRate}
        rateUpdatedAt={rateUpdatedAt}
        stale={rateStale}
        {...ratePreview}
      />
    </BottomSheetScrollView>
  );
}
