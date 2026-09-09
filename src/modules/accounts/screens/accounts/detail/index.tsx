import { PressableFeedback, Typography } from 'heroui-native';
import React from 'react';
import { Controller } from 'react-hook-form';
import Animated from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { FormErrorText } from '@/components/ui/form_error_text';
import { FormSectionLabel } from '@/components/ui/form_section_label';
import { Input } from '@/components/ui/input';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';
import { DetailRowsCard } from '@/modules/transactions/screens/transactions/detail/components/detail_rows_card';

import { AccountColorField } from '../../../components/account_form/account_color_field';
import { useAccountDetailAnim } from './account_detail.anim';
import { useAccountDetail } from './account_detail.hook';
import { AccountActivityCard } from './components/account_activity_card';
import { AccountFactRow } from './components/account_fact_row';
import { buildAccountFacts } from './components/account_facts.helpers';
import { AdjustBalanceSheet } from './components/adjust_balance_sheet';
import { ArchiveConfirmationDialog } from './components/archive_confirmation_dialog';
import { BalanceHero } from './components/balance_hero';
import { BalanceReviewAlert } from './components/balance_review_alert';
import { shouldShowBalanceReview } from './components/balance_review_alert.helpers';

const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

export default function AccountDetailScreen() {
  const {
    state: {
      account,
      isEditing,
      isAdjustVisible,
      isArchiveVisible,
      isSaving,
      isAdjusting,
      isArchiving,
      isConfirmingBalanceReview,
      balanceReviewError,
      archiveError,
      activity,
    },
    form,
    setEditing,
    handleSave,
    setAdjustVisible,
    handleAdjustBalance,
    setArchiveVisible,
    closeArchive,
    handleArchive,
    handleConfirmBalanceReviewed,
    onBack,
    retryActivity,
    goToTransaction,
    goToAllTransactions,
    addTransactionForAccount,
  } = useAccountDetail();
  const { headerStyle, triggerEditToggle, fieldEntering, fieldExiting } = useAccountDetailAnim();
  const {
    control,
    formState: { errors },
  } = form;

  if (!account) return null;

  const facts = [...buildAccountFacts(account), ...activity.monthFacts];

  return (
    <Screen>
      <Animated.View style={headerStyle}>
        <StackHeader
          title={account.name}
          onBack={onBack}
          right={
            isEditing ? (
              <PressableFeedback
                onPress={() => {
                  triggerEditToggle();
                  void handleSave();
                }}
                isDisabled={isSaving}
                hitSlop={hitSlop}
                className="bg-gold-500 border-gold-500 h-9 w-9 items-center justify-center rounded-[8px] border"
              >
                <Typography className="font-sora-bold text-accent-foreground text-[11px]">
                  {Strings.accountDetailSave}
                </Typography>
              </PressableFeedback>
            ) : (
              <PressableFeedback
                onPress={() => {
                  triggerEditToggle();
                  setEditing(true);
                }}
                hitSlop={hitSlop}
                className="bg-surface border-border h-9 w-9 items-center justify-center rounded-[8px] border"
              >
                <Typography className="font-sora-bold text-accent text-[11px]">
                  {Strings.accountDetailEdit}
                </Typography>
              </PressableFeedback>
            )
          }
        />
      </Animated.View>

      <ScreenScroll
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <BalanceHero account={account} />

        {!isEditing && shouldShowBalanceReview(account) ? (
          <BalanceReviewAlert
            onAdjust={() => setAdjustVisible(true)}
            onConfirm={() => {
              void handleConfirmBalanceReviewed();
            }}
            isConfirming={isConfirmingBalanceReview}
            errorMessage={balanceReviewError}
          />
        ) : null}

        {isEditing && (
          <Animated.View entering={fieldEntering} exiting={fieldExiting} className="mx-4 mt-4">
            <FormSectionLabel>{Strings.o4SectionName}</FormSectionLabel>
            <Controller
              control={control}
              name="name"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  maxLength={30}
                  isInvalid={!!errors.name}
                />
              )}
            />
            <FormErrorText message={errors.name?.message} />

            <Controller
              control={control}
              name="color"
              render={({ field: { value, onChange } }) => (
                <AccountColorField ownerId="accounts/detail" value={value} onChange={onChange} />
              )}
            />
          </Animated.View>
        )}

        <DetailRowsCard>
          {facts.map((fact, index) => (
            <AccountFactRow
              key={fact.label}
              label={fact.label}
              value={fact.value}
              valueColor={fact.valueColor}
              showDivider={index < facts.length - 1}
            />
          ))}
        </DetailRowsCard>

        {!isEditing && (
          <>
            <Box style={{ flexDirection: 'row' }} className="mx-4 mt-4 gap-2">
              <Box style={{ flex: 1 }}>
                <Button
                  variant="secondary"
                  flat
                  icon="pencil-outline"
                  label={Strings.accountDetailAdjustBalance}
                  onPress={() => setAdjustVisible(true)}
                />
              </Box>
              <Box style={{ flex: 1 }}>
                <Button
                  variant="secondary"
                  flat
                  tone="danger"
                  icon="archive-outline"
                  label={Strings.accountDetailArchive}
                  onPress={() => setArchiveVisible(true)}
                />
              </Box>
            </Box>
            {/* The card's own header and container carry `mx-4`, so it is the Box's sibling. */}
            <AccountActivityCard
              status={activity.status}
              rows={activity.rows}
              onRowPress={goToTransaction}
              onSeeAll={goToAllTransactions}
              onAdd={addTransactionForAccount}
              onRetry={retryActivity}
            />
          </>
        )}
      </ScreenScroll>

      <AdjustBalanceSheet
        isOpen={isAdjustVisible}
        currentBalance={account.current_balance}
        currency={account.currency}
        accountType={account.type}
        onOpenChange={(open) => {
          if (!open) setAdjustVisible(false);
        }}
        // The sheet awaits this promise; wrapping it in `void` makes a failed adjust silent.
        onSave={handleAdjustBalance}
        isLoading={isAdjusting}
      />

      <ArchiveConfirmationDialog
        visible={isArchiveVisible}
        account={account}
        onClose={closeArchive}
        onConfirm={() => {
          void handleArchive();
        }}
        isLoading={isArchiving}
        errorMessage={archiveError}
      />
    </Screen>
  );
}
