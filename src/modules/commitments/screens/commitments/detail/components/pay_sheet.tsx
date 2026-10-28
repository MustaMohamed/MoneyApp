import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { View, useWindowDimensions } from 'react-native';

import { AccountStrip } from '@/components/ui/account_strip';
import { AmountHero } from '@/components/ui/amount_hero';
import { Button } from '@/components/ui/button';
import { DateRow } from '@/components/ui/date_row';
import { FormErrorText } from '@/components/ui/form_error_text';
import {
  FORM_FACT_CELL_CLASS,
  FORM_SHEET_CONTENT_CONTAINER_STYLE,
  FORM_SHEET_STATUS_GAP,
  resolveFormSupportLineTextProps,
} from '@/components/ui/form_sheet.geometry';
import { FormStripRow, FormSupportLineSlot } from '@/components/ui/form_type_tabs';
import { ListCard } from '@/components/ui/list_card';
import { NoteFactRow } from '@/components/ui/note_fact_row';
import { useNoteReveal } from '@/components/ui/note_reveal.hook';
import { Sheet } from '@/components/ui/sheet';
import { StatusTrack } from '@/components/ui/status_track';
import { Text } from '@/components/ui/text';
import { ValidationSlot } from '@/components/ui/validation_slot';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';
import { ExchangeRateRow } from '@/modules/transactions/components/exchange_rate_row';
import { AMOUNT_HERO_TONE } from '@/modules/transactions/constants/amount_hero_tone';
import { formatCurrencyAmount } from '@/utils/format_amount';

import type { Commitment } from '../../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../../entities/commitment_payment.entity';
import { usePaySheet } from './pay_sheet.hook';

interface Props {
  owner: string;
  commitment: Commitment | undefined;
  payment: CommitmentPayment | undefined;
  today: string | undefined;
}

export function PaySheet({ owner, commitment, payment, today }: Props) {
  const {
    state,
    onSubmit,
    selectAccount,
    setVisible,
    toggleRateOverride,
    setAmountText,
    setExchangeRate,
    setPaidDate,
    setNote,
  } = usePaySheet(owner, commitment, payment, today);
  const { scrollRef, handleScrollLayout, handleNoteFocus, handleNoteBlur } = useNoteReveal();
  const { fontScale } = useWindowDimensions();

  return (
    <Sheet
      isOpen={state.visible}
      onOpenChange={(open) => {
        if (!open) setVisible(false);
      }}
      title={commitment ? Strings.commitmentsPayTitle(commitment.name) : ''}
      size="lg"
      scrollable
      liftsAboveKeyboard
      footer={
        <View>
          {state.saveError !== undefined ? (
            <View testID="pay-sheet-save-error">
              <FormErrorText
                message={state.saveError}
                disableAnimation
                style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
              />
            </View>
          ) : null}
          <StatusTrack
            testID="pay-sheet-status"
            footnote={state.trackFootnote}
            message={state.statusMessage}
          />
          <View style={{ height: FORM_SHEET_STATUS_GAP }} />
          <Button
            variant="primary"
            flat
            label={state.ctaLabel}
            isLoading={state.saving}
            isDisabled={state.saving}
            onPress={() => void onSubmit()}
          />
        </View>
      }
    >
      {commitment ? (
        <BottomSheetScrollView
          ref={scrollRef}
          testID="pay-sheet-scroll"
          style={{ flex: 1 }}
          onLayout={handleScrollLayout}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormSupportLineSlot>
            <Text
              testID="pay-sheet-strip-caption"
              className="font-inter text-muted"
              {...resolveFormSupportLineTextProps('wrap', fontScale)}
            >
              {Strings.commitmentsPayStripCaption}
            </Text>
          </FormSupportLineSlot>
          <FormStripRow>
            <AccountStrip
              chips={state.stripChips}
              onSelect={selectAccount}
              error={state.errors.account}
            />
          </FormStripRow>

          <AmountHero
            value={state.amountText}
            onChange={setAmountText}
            tone={AMOUNT_HERO_TONE[TransactionType.Expense]}
            currency={commitment.currency}
            invalid={state.errors.amount !== undefined}
            accessibilityLabel={Strings.commitmentsPayAmountA11y}
          />
          <ValidationSlot
            testID="amount-error-slot"
            liveTestID="amount-error-live"
            message={state.errors.amount}
          />

          {state.requiresRate ? (
            <View style={{ paddingHorizontal: Spacing.md }}>
              <ExchangeRateRow
                value={state.exchangeRateValue ?? ''}
                onChange={setExchangeRate}
                overrideEnabled={state.rateOverride}
                onToggleOverride={toggleRateOverride}
                rateUpdatedAt={state.rateUpdatedAt}
                previewEgpAmount={state.previewEgpAmount}
                previewHidden={state.previewHidden}
                purposeCaption={state.purposeCaption}
                error={state.errors.rate}
              />
              {/* Converted total: decimals come from CURRENCY_CONFIG, with no override. */}
              {state.convertedTotal ? (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    marginTop: Spacing.xs,
                  }}
                >
                  <Text
                    className="font-sora-semibold text-foreground"
                    style={{
                      fontSize: Type.bodyStrong,
                      lineHeight: lineHeightFor(Type.bodyStrong),
                    }}
                  >
                    {Strings.commitmentsPayConvertedTotal(
                      formatCurrencyAmount(
                        state.convertedTotal.amount,
                        state.convertedTotal.currency,
                      ),
                    )}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={FORM_SHEET_CONTENT_CONTAINER_STYLE}>
            <ListCard testID="pay-sheet-fact-group">
              <View className={FORM_FACT_CELL_CLASS}>
                <DateRow
                  ownerId={owner}
                  value={state.paidDate}
                  onChange={setPaidDate}
                  divider={false}
                />
              </View>
              <NoteFactRow
                label={Strings.addTxNoteLabel}
                placeholder={Strings.addTxNotePlaceholder}
                value={state.note}
                onChangeText={setNote}
                onFocus={handleNoteFocus}
                onBlur={handleNoteBlur}
              />
            </ListCard>
          </View>
        </BottomSheetScrollView>
      ) : null}
    </Sheet>
  );
}
