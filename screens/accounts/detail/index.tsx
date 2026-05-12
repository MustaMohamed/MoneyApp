import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Controller } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back_button';

import { AccountColors, Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { useAccountDetail } from './account_detail.hook';
import { useAccountDetailAnim } from './account_detail.anim';
import { MiniChart } from './components/mini_chart';
import { AdjustBalanceSheet } from './components/adjust_balance_sheet';
import { ArchiveConfirmationDialog } from './components/archive_confirmation_dialog';

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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Animated.View style={[styles.header, headerStyle]}>
        <BackButton onPress={onBack} />

        <Text style={styles.headerTitle} numberOfLines={1}>
          {account.name}
        </Text>

        {isEditing ? (
          <Pressable
            onPress={() => {
              triggerEditToggle();
              handleSave();
            }}
            disabled={isSaving}
            style={[styles.iconBtn, styles.saveBtn]}
            hitSlop={hitSlop}
          >
            <Text style={styles.saveBtnText}>{Strings.accountDetailSave}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              triggerEditToggle();
              setEditing(true);
            }}
            style={styles.iconBtn}
            hitSlop={hitSlop}
          >
            <Text style={styles.editBtnText}>{Strings.accountDetailEdit}</Text>
          </Pressable>
        )}
      </Animated.View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <MiniChart account={account} />

        {isEditing && (
          <Animated.View entering={fieldEntering} exiting={fieldExiting} style={styles.editBlock}>
            <Text style={styles.fieldLabel}>{Strings.o4SectionName}</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  maxLength={30}
                  style={styles.input}
                  placeholderTextColor={Colors.dark.text3}
                />
              )}
            />
            {errors.name && (
              <Animated.Text entering={errorEntering} exiting={errorExiting} style={styles.error}>
                {errors.name.message}
              </Animated.Text>
            )}

            <Text style={[styles.fieldLabel, { marginTop: Spacing.sm }]}>
              {Strings.o4SectionColor}
            </Text>
            <Controller
              control={control}
              name="color"
              render={({ field: { value, onChange } }) => (
                <View style={styles.colorRow}>
                  {AccountColors.map((c) => (
                    <Pressable key={c} onPress={() => onChange(c)} style={styles.colorDotWrap}>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: c },
                          value === c && styles.colorDotSelected,
                        ]}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </Animated.View>
        )}

        {!isEditing && (
          <View style={styles.actionsBlock}>
            <Pressable onPress={() => setAdjustVisible(true)} style={styles.actionRow}>
              <MaterialCommunityIcons name="pencil" size={Size.iconSm} color={Colors.dark.text2} />
              <Text style={styles.actionText}>{Strings.accountDetailAdjustBalance}</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={Size.iconSm}
                color={Colors.dark.text2}
              />
            </Pressable>
            <View style={styles.divider} />
            <Pressable onPress={() => setArchiveVisible(true)} style={styles.actionRow}>
              <MaterialCommunityIcons
                name="archive"
                size={Size.iconSm}
                color={Colors.dark.negative}
              />
              <Text style={[styles.actionText, styles.destructive]}>
                {Strings.accountDetailArchive}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={Size.iconSm}
                color={Colors.dark.negative}
              />
            </Pressable>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      <AdjustBalanceSheet
        visible={isAdjustVisible}
        currentBalance={account.current_balance}
        currency={account.currency}
        onClose={() => setAdjustVisible(false)}
        onSave={handleAdjustBalance}
        isLoading={isAdjusting}
      />

      <ArchiveConfirmationDialog
        visible={isArchiveVisible}
        account={account}
        onClose={() => setArchiveVisible(false)}
        onConfirm={handleArchive}
        isLoading={isArchiving}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    textAlign: 'center',
    marginHorizontal: Spacing.xs,
  },
  iconBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    borderRadius: Spacing.sm,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: { backgroundColor: Colors.shared.cairoGold, borderColor: Colors.shared.cairoGold },
  saveBtnText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.caption,
    color: Colors.shared.midnightBlue,
  },
  editBtnText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.caption,
    color: Colors.shared.cairoGold,
  },
  scroll: { flex: 1 },
  editBlock: { marginHorizontal: Spacing.sm, marginTop: Spacing.md },
  fieldLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.micro,
    color: Colors.shared.cairoGold,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  input: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  error: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.negative,
    marginTop: Spacing.xxs,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  colorDotWrap: { padding: Spacing.xxs },
  colorDot: { width: Size.colorDot, height: Size.colorDot, borderRadius: Size.colorDot / 2 },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: Colors.shared.cairoGold,
    transform: [{ scale: 1.1 }],
  },
  actionsBlock: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.lg,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  actionText: {
    flex: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  destructive: { color: Colors.dark.negative },
  divider: {
    height: Size.hairline,
    backgroundColor: Colors.dark.border,
    marginHorizontal: Spacing.md,
  },
  bottomPad: { height: Spacing.xxl },
});
