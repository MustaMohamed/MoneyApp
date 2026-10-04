import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Input, Spinner } from 'heroui-native';
import { View } from 'react-native';

import { TYPE_OPTIONS } from '@/components/account_type_pill';
import { AccountColorTile } from '@/components/ui/account_color_tile';
import { FormErrorText } from '@/components/ui/form_error_text';
import { ListCard } from '@/components/ui/list_card';
import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { resolveAccountGlyphColor } from '@/modules/accounts/constants/account_glyph_color';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

import { AccountStrip } from './components/account_strip';
import { AmountHero } from './components/amount_hero';
import { DangerRing } from './components/danger_ring';
import { DateRow } from './components/date_row';
import { FormPickerRow } from './components/form_picker_row';
import { TransactionExchangeRateRow } from './components/transaction_exchange_rate_row';
import {
  ACCOUNT_STRIP_WRAPPER_PADDING_Y,
  FACT_ROW_MIN_HEIGHT,
  TRANSACTION_FORM_CONTENT_CONTAINER_STYLE,
} from './components/transaction_form.geometry';
import { TypeTabs } from './components/type_tabs';
import {
  type AccountStripChip,
  resolveBudgetFieldError,
  resolveToRowFace,
} from './transaction_form.helpers';
import type { TransactionFormMode } from './transaction_form.types';

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
  setExchangeRate: (v: string) => void;
  rateOverride: boolean;
  toggleRateOverride: () => void;
  rateUpdatedAt: string | null;
  rateError?: string;
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

export const TRANSACTION_FORM_ERROR_SLOT_HEIGHT = ms(16);

// Canvas `.fact`: 16 inset, a hairline under every fact but the last (Note).
const FACT_CELL_CLASS = 'border-separator border-b px-4';

interface ValidationSlotProps {
  testID: string;
  message?: string;
}

function ValidationSlot({ testID, message }: ValidationSlotProps) {
  return (
    <View
      testID={testID}
      style={{ minHeight: TRANSACTION_FORM_ERROR_SLOT_HEIGHT }}
      className="justify-center px-4"
      accessibilityLiveRegion="polite"
    >
      <FormErrorText
        message={message}
        numberOfLines={1}
        disableAnimation
        style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro), textAlign: 'center' }}
      />
    </View>
  );
}

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
    setExchangeRate,
    rateOverride,
    toggleRateOverride,
    rateUpdatedAt,
    rateError,
    date,
    setDate,
    note,
    setNote,
    currency,
  } = props;
  const { onFocus: onInputFocus, onBlur: onInputBlur } = useBottomSheetAwareHandlers();

  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const budgetFieldError = resolveBudgetFieldError(budgetError, budgetLookupError);
  const stripCaption = isTransferOrCC ? Strings.addTxFromLabel : undefined;
  const toRowFace = resolveToRowFace({ locked, account: selectedToAccount ?? undefined });

  return (
    <BottomSheetScrollView
      testID="transaction-form-scroll"
      style={{ flex: 1 }}
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
          style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
          numberOfLines={1}
        >
          {typeSupportingText}
        </Text>
      </View>
      <View
        className="border-separator border-b"
        style={{ paddingVertical: ACCOUNT_STRIP_WRAPPER_PADDING_Y }}
      >
        {props.locked ? (
          <AccountStrip chips={props.lockedChips} caption={stripCaption} />
        ) : (
          <AccountStrip
            chips={props.stripChips}
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

      <AmountHero
        onChange={setAmountStr}
        type={type}
        currency={currency}
        mode={formMode}
        invalid={amountError !== undefined}
      />
      <ValidationSlot testID="amount-error-slot" message={amountError} />

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
                valueNumberOfLines={budgetLookupError ? 2 : undefined}
                valueClassName={budgetLookupError ? 'font-inter-medium text-danger' : undefined}
                valueStyle={
                  budgetLookupError
                    ? { fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }
                    : undefined
                }
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
            <View className="border-separator border-b px-4 pb-3">
              <TransactionExchangeRateRow
                value={exchangeRate}
                onChange={setExchangeRate}
                overrideEnabled={rateOverride}
                onToggleOverride={toggleRateOverride}
                rateUpdatedAt={rateUpdatedAt}
                mode={formMode}
                type={type}
                sourceCurrency={selectedAccount?.currency}
                destinationCurrency={selectedToAccount?.currency}
                error={rateError}
              />
            </View>
          ) : null}

          <View className={FACT_CELL_CLASS}>
            <DateRow ownerId={datePickerOwnerId} value={date} onChange={setDate} divider={false} />
          </View>

          <View
            testID="note-row"
            className="gap-3 px-4"
            style={{ minHeight: FACT_ROW_MIN_HEIGHT, flexDirection: 'row', alignItems: 'center' }}
          >
            <Text
              className="font-inter text-content-secondary"
              style={{ flexShrink: 0, fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
            >
              {Strings.addTxNoteLabel}
            </Text>
            <Input
              value={note}
              onChangeText={setNote}
              placeholder={Strings.addTxNotePlaceholder}
              placeholderTextColor={CoreTokens.text2}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              // Android: a single-line edit text keeps the parent's touch lock, so a drag that starts on it never scrolls the form.
              multiline
              submitBehavior="blurAndSubmit"
              variant="secondary"
              className="font-sora text-foreground rounded-none border-0 bg-transparent p-0 tabular-nums"
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: FACT_ROW_MIN_HEIGHT,
                textAlign: 'right',
                fontSize: Type.body,
                lineHeight: lineHeightFor(Type.body),
              }}
            />
          </View>
        </ListCard>
      </View>
    </BottomSheetScrollView>
  );
}
