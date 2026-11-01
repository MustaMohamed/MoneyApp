import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { View, useWindowDimensions } from 'react-native';

import { AccountStrip } from '@/components/ui/account_strip';
import { AmountHero } from '@/components/ui/amount_hero';
import { ConvertedAmountLine } from '@/components/ui/converted_amount_line';
import { DateRow } from '@/components/ui/date_row';
import { FormFactCell } from '@/components/ui/form_fact_cell';
import {
  FORM_SHEET_CONTENT_CONTAINER_STYLE,
  resolveFormSupportLineTextProps,
} from '@/components/ui/form_sheet.geometry';
import { FormSheetFooter } from '@/components/ui/form_sheet_footer';
import { FormStripRow, FormSupportLineSlot, FormTypeTabsRow } from '@/components/ui/form_type_tabs';
import { ListCard } from '@/components/ui/list_card';
import { NoAccountsEmpty } from '@/components/ui/no_accounts_empty';
import { NoteFactRow } from '@/components/ui/note_fact_row';
import { useNoteReveal } from '@/components/ui/note_reveal.hook';
import { RateEditor } from '@/components/ui/rate_editor_sheet';
import { RateRow } from '@/components/ui/rate_row';
import { Sheet } from '@/components/ui/sheet';
import { StatusBadge } from '@/components/ui/status_badge';
import { Text } from '@/components/ui/text';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { ValidationSlot } from '@/components/ui/validation_slot';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Spacing, Type } from '@/constants/theme';
import { AMOUNT_HERO_TONE } from '@/modules/transactions/constants/amount_hero_tone';

import type { Commitment } from '../../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../../entities/commitment_payment.entity';
import { DAY_INDICATOR_CLASS } from '../../../../utils/day_indicator';
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
    commitRate,
    convertedFor,
    requestAccountCreation,
    handleCloseComplete,
    setAmountText,
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
      onCloseComplete={handleCloseComplete}
      title={commitment ? Strings.commitmentsPayTitle(commitment.name) : ''}
      size="lg"
      scrollable
      liftsAboveKeyboard
      footer={
        state.noAccounts ? undefined : (
          <FormSheetFooter
            statusTestID="pay-sheet-status"
            showsStatusTrack
            footnote={state.trackFootnote}
            message={state.statusMessage}
            label={state.ctaLabel}
            isLoading={state.saving}
            isDisabled={state.saving || state.settled}
            onPress={() => void onSubmit()}
          />
        )
      }
    >
      {commitment === undefined ? null : state.noAccounts ? (
        <NoAccountsEmpty onAddAccount={requestAccountCreation} />
      ) : (
        <BottomSheetScrollView
          ref={scrollRef}
          testID="pay-sheet-scroll"
          style={{ flex: 1 }}
          onLayout={handleScrollLayout}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {state.cycleLine === undefined ? null : (
            <FormTypeTabsRow>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                <StatusBadge
                  size="tagMd"
                  fontScale={fontScale}
                  label={state.cycleLine.statusLabel}
                  icon={state.cycleLine.statusIcon}
                  fill={state.cycleLine.statusFill}
                  foreground={state.cycleLine.statusForeground}
                />
                <Text
                  testID="pay-sheet-cycle-line"
                  allowFontScaling={false}
                  accessibilityLabel={state.cycleLine.line}
                  className={DAY_INDICATOR_CLASS.caption}
                  style={{ ...scaledTextStyle(Type.caption, fontScale), flex: 1 }}
                >
                  {state.cycleLine.lead}
                  <Text
                    allowFontScaling={false}
                    className={DAY_INDICATOR_CLASS[state.cycleLine.distanceTone]}
                    style={scaledTextStyle(Type.caption, fontScale)}
                  >
                    {state.cycleLine.distance}
                  </Text>
                </Text>
              </View>
            </FormTypeTabsRow>
          )}
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
          >
            {state.requiresRate && state.errors.amount === undefined ? (
              <ConvertedAmountLine converted={state.converted} />
            ) : null}
          </ValidationSlot>

          <View style={FORM_SHEET_CONTENT_CONTAINER_STYLE}>
            <ListCard testID="pay-sheet-fact-group">
              {state.requiresRate ? (
                <FormFactCell fault={state.errors.rate} ringTestID="rate-ring">
                  <RateRow
                    ownerId={owner}
                    value={state.exchangeRateValue ?? ''}
                    stale={state.rateStale}
                  />
                </FormFactCell>
              ) : null}
              <FormFactCell>
                <DateRow
                  ownerId={owner}
                  value={state.paidDate}
                  onChange={setPaidDate}
                  divider={false}
                />
              </FormFactCell>
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
          <RateEditor
            ownerId={owner}
            value={state.exchangeRateValue ?? ''}
            onCommit={commitRate}
            storedRate={state.storedRate}
            rateUpdatedAt={state.rateUpdatedAt}
            stale={state.rateStale}
            convertedFor={convertedFor}
          />
        </BottomSheetScrollView>
      )}
    </Sheet>
  );
}
