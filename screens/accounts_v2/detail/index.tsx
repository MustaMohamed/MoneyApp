import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BackButton } from '@/components/ui/back_button';
import { Box } from '@/components/ui/box';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';

import { ACCOUNT_COLORS } from '../add_account/add_account.hook';
import { useAccountDetailAnim } from './account_detail.anim';
import { useAccountDetail } from './account_detail.hook';
import { AdjustBalanceSheet } from './components/adjust_balance_sheet';
import { ArchiveConfirmationDialog } from './components/archive_confirmation_dialog';
import { BalanceHero } from './components/balance_hero';

const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

export default function AccountDetailScreenV2() {
  const {
    state: {
      account,
      isEditing,
      isAdjustVisible,
      isArchiveVisible,
      isSaving,
      isAdjusting,
      isArchiving,
    },
    form,
    setEditing,
    handleSave,
    setAdjustVisible,
    handleAdjustBalance,
    setArchiveVisible,
    handleArchive,
    onBack,
  } = useAccountDetail();
  const {
    headerStyle,
    triggerEditToggle,
    fieldEntering,
    fieldExiting,
    errorEntering,
    errorExiting,
  } = useAccountDetailAnim();
  const {
    control,
    formState: { errors },
  } = form;

  if (!account) return null;

  return (
    <Screen>
      <Animated.View style={headerStyle}>
        <Box
          style={{ flexDirection: 'row', height: 56 }}
          className="items-center justify-between px-2"
        >
          <BackButton onPress={onBack} />

          <Text variant="title" numberOfLines={1} className="font-soraBold flex-1 text-center">
            {account.name}
          </Text>

          {isEditing ? (
            <Pressable
              onPress={() => {
                triggerEditToggle();
                void handleSave();
              }}
              disabled={isSaving}
              hitSlop={hitSlop}
              className="bg-gold-500 border-gold-500 h-9 w-9 items-center justify-center rounded-[8px] border"
            >
              <Text variant="caption" className="font-soraBold text-accent-foreground">
                {Strings.accountDetailSave}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                triggerEditToggle();
                setEditing(true);
              }}
              hitSlop={hitSlop}
              className="bg-surface border-border h-9 w-9 items-center justify-center rounded-[8px] border"
            >
              <Text variant="caption" className="font-soraBold text-accent">
                {Strings.accountDetailEdit}
              </Text>
            </Pressable>
          )}
        </Box>
      </Animated.View>

      <ScreenScroll
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <BalanceHero account={account} />

        {isEditing && (
          <Animated.View entering={fieldEntering} exiting={fieldExiting} className="mx-4 mt-4">
            <Text variant="hint" className="font-soraBold text-gold-500 pb-2 tracking-widest">
              {Strings.o4SectionName}
            </Text>
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
            {errors.name ? (
              <Animated.Text
                entering={errorEntering}
                exiting={errorExiting}
                className="text-negative font-inter mt-1 text-[12px]"
              >
                {errors.name.message}
              </Animated.Text>
            ) : null}

            <Text variant="hint" className="font-soraBold text-gold-500 pt-3 pb-2 tracking-widest">
              {Strings.o4SectionColor}
            </Text>
            <Controller
              control={control}
              name="color"
              render={({ field: { value, onChange } }) => (
                <Box style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
                  {ACCOUNT_COLORS.map((c) => (
                    <Pressable key={c} onPress={() => onChange(c)} className="p-0.5">
                      <Box
                        className={
                          value === c
                            ? 'border-gold-500 h-8 w-8 scale-110 rounded-full border-2'
                            : 'h-8 w-8 rounded-full'
                        }
                        style={{ backgroundColor: c }}
                      />
                    </Pressable>
                  ))}
                </Box>
              )}
            />
          </Animated.View>
        )}

        {!isEditing && (
          <Box className="bg-surface border-border mx-4 mt-5 overflow-hidden rounded-2xl border">
            <Pressable
              onPress={() => setAdjustVisible(true)}
              style={{ flexDirection: 'row', minHeight: 48 }}
              className="items-center gap-3 px-4 py-3"
            >
              <MaterialCommunityIcons name="pencil" size={20} color={CoreTokens.text2} />
              <Text variant="body" className="text-foreground flex-1">
                {Strings.accountDetailAdjustBalance}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={CoreTokens.text2} />
            </Pressable>

            <View className="border-separator border-t" style={{ marginHorizontal: 16 }} />

            <Pressable
              onPress={() => setArchiveVisible(true)}
              style={{ flexDirection: 'row', minHeight: 48 }}
              className="items-center gap-3 px-4 py-3"
            >
              <MaterialCommunityIcons name="archive" size={20} color={SemanticTokens.negative} />
              <Text variant="body" className="text-danger flex-1">
                {Strings.accountDetailArchive}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={SemanticTokens.negative}
              />
            </Pressable>
          </Box>
        )}
      </ScreenScroll>

      <AdjustBalanceSheet
        visible={isAdjustVisible}
        currentBalance={account.current_balance}
        currency={account.currency}
        onClose={() => setAdjustVisible(false)}
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
