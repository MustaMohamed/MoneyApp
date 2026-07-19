import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ListGroup, PressableFeedback, Separator, Text } from 'heroui-native';
import React from 'react';
import { Controller } from 'react-hook-form';
import Animated from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { ColorSwatchPicker } from '@/components/ui/color_swatch_picker';
import { FormErrorText } from '@/components/ui/form_error_text';
import { FormSectionLabel } from '@/components/ui/form_section_label';
import { Input } from '@/components/ui/input';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';
import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';

import { ACCOUNT_COLORS } from '../add_account/add_account.hook';
import { useAccountDetailAnim } from './account_detail.anim';
import { useAccountDetail } from './account_detail.hook';
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
    },
    form,
    setEditing,
    handleSave,
    setAdjustVisible,
    handleAdjustBalance,
    setArchiveVisible,
    handleArchive,
    handleConfirmBalanceReviewed,
    onBack,
  } = useAccountDetail();
  const { headerStyle, triggerEditToggle, fieldEntering, fieldExiting } = useAccountDetailAnim();
  const {
    control,
    formState: { errors },
  } = form;

  if (!account) return null;

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
                <Text className="font-sora-bold text-accent-foreground text-[11px]">
                  {Strings.accountDetailSave}
                </Text>
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
                <Text className="font-sora-bold text-accent text-[11px]">
                  {Strings.accountDetailEdit}
                </Text>
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

            <FormSectionLabel>{Strings.o4SectionColor}</FormSectionLabel>
            <Controller
              control={control}
              name="color"
              render={({ field: { value, onChange } }) => (
                <ColorSwatchPicker colors={ACCOUNT_COLORS} value={value} onChange={onChange} />
              )}
            />
          </Animated.View>
        )}

        {!isEditing && (
          <Box className="mx-4 mt-5">
            <ListGroup>
              <ListGroup.Item onPress={() => setAdjustVisible(true)}>
                <ListGroup.ItemPrefix>
                  <MaterialCommunityIcons name="pencil" size={20} color={CoreTokens.text2} />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{Strings.accountDetailAdjustBalance}</ListGroup.ItemTitle>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix />
              </ListGroup.Item>
              <Separator className="mx-4" />
              <ListGroup.Item onPress={() => setArchiveVisible(true)}>
                <ListGroup.ItemPrefix>
                  <MaterialCommunityIcons
                    name="archive"
                    size={20}
                    color={SemanticTokens.negative}
                  />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle className="text-danger">
                    {Strings.accountDetailArchive}
                  </ListGroup.ItemTitle>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix iconProps={{ color: SemanticTokens.negative }} />
              </ListGroup.Item>
            </ListGroup>
          </Box>
        )}
      </ScreenScroll>

      <AdjustBalanceSheet
        isOpen={isAdjustVisible}
        currentBalance={account.current_balance}
        currency={account.currency}
        onOpenChange={(open) => {
          if (!open) setAdjustVisible(false);
        }}
        onSave={(newBalance: number) => {
          void handleAdjustBalance(newBalance);
        }}
        isLoading={isAdjusting}
      />

      <ArchiveConfirmationDialog
        visible={isArchiveVisible}
        account={account}
        onClose={() => setArchiveVisible(false)}
        onConfirm={() => {
          void handleArchive();
        }}
        isLoading={isArchiving}
      />
    </Screen>
  );
}
