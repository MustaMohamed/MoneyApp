import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { View, useWindowDimensions } from 'react-native';

import { AccountStrip } from '@/components/ui/account_strip';
import { AmountHero } from '@/components/ui/amount_hero';
import { Button } from '@/components/ui/button';
import { ConvertedAmountLine } from '@/components/ui/converted_amount_line';
import { DangerRing } from '@/components/ui/danger_ring';
import { DateRow } from '@/components/ui/date_row';
import {
  FORM_FACT_CELL_CLASS,
  FORM_SHEET_CONTENT_CONTAINER_STYLE,
  FORM_SHEET_STATUS_GAP,
  resolveFormSupportLineTextProps,
} from '@/components/ui/form_sheet.geometry';
import { FormStripRow, FormSupportLineSlot, FormTypeTabsRow } from '@/components/ui/form_type_tabs';
import { ListCard } from '@/components/ui/list_card';
import { NoAccountsEmpty } from '@/components/ui/no_accounts_empty';
import { NoteFactRow } from '@/components/ui/note_fact_row';
import { useNoteReveal } from '@/components/ui/note_reveal.hook';
import { RateEditor } from '@/components/ui/rate_editor_sheet';
import { RateRow } from '@/components/ui/rate_row';
import { Sheet } from '@/components/ui/sheet';
import { StatusBadge } from '@/components/ui/status_badge';
import { StatusTrack } from '@/components/ui/status_track';
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
          <View>
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
              isDisabled={state.saving || state.settled}
              onPress={() => void onSubmit()}
            />
          </View>
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
                <View className={FORM_FACT_CELL_CLASS}>
                  <RateRow
                    ownerId={owner}
                    value={state.exchangeRateValue ?? ''}
                    stale={state.rateStale}
                  />
                  {state.errors.rate !== undefined ? <DangerRing testID="rate-ring" /> : null}
                </View>
              ) : null}
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
