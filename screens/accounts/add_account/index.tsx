import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Controller, useWatch } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import {
  AccountColors,
  Colors,
  FontFamily,
  Radius,
  Size,
  Spacing,
  TouchSize,
  Type,
} from '@/constants/theme';
import { AccountType, Currency } from '@/constants/enums';
import { useAddAccountApp } from './add_account.hook';
import { useAddAccountAnim } from './add_account.anim';
import { TypePill, TYPE_OPTIONS } from './components/type_pill';

const CURRENCY_OPTIONS: Currency[] = [Currency.EGP, Currency.USD];

const hitSlop = {
  top: TouchSize.min / 4,
  bottom: TouchSize.min / 4,
  left: TouchSize.min / 4,
  right: TouchSize.min / 4,
};

export default function AddAccountAppScreen() {
  const { form, handleSave, onBack } = useAddAccountApp();
  const {
    btnAnim,
    triggerBtnPress,
    ccEntering,
    ccExiting,
    aprEntering,
    aprExiting,
    errorEntering,
    errorExiting,
  } = useAddAccountAnim();
  const {
    control,
    formState: { errors, isSubmitting },
  } = form;
  const selectedType = useWatch({ control, name: 'selected_type' });
  const selectedColor = useWatch({ control, name: 'selected_color' });
  const selectedCurrency = useWatch({ control, name: 'currency' });
  const interestTracking = useWatch({ control, name: 'interest_tracking' });
  const isCreditCard = selectedType === AccountType.CreditCard;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={hitSlop}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={Size.iconBack}
            color={Colors.dark.text2}
          />
        </Pressable>
        <Text style={styles.headerTitle}>{Strings.u4Title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>{Strings.o4SectionType}</Text>
        <View style={styles.typeGrid}>
          {TYPE_OPTIONS.map((opt) => (
            <TypePill
              key={opt.type}
              option={opt}
              isSelected={selectedType === opt.type}
              onSelect={() => form.setValue('selected_type', opt.type, { shouldValidate: true })}
            />
          ))}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>{Strings.o4SectionName}</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.o4NamePlaceholder}
                placeholderTextColor={Colors.dark.text3}
                maxLength={30}
                style={styles.input}
              />
            )}
          />
          {errors.name && (
            <Animated.Text entering={errorEntering} exiting={errorExiting} style={styles.errorText}>
              {errors.name.message}
            </Animated.Text>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>{Strings.o4SectionCurrency}</Text>
          <View style={styles.currencyRow}>
            {CURRENCY_OPTIONS.map((code) => (
              <Pressable
                key={code}
                onPress={() => form.setValue('currency', code)}
                style={[
                  styles.currencyPill,
                  selectedCurrency === code ? styles.pillActive : styles.pillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.currencyText,
                    {
                      color:
                        selectedCurrency === code ? Colors.shared.cairoGold : Colors.dark.text2,
                    },
                  ]}
                >
                  {code === Currency.EGP ? Strings.currencyEGPCode : Strings.currencyUSDCode}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>{Strings.o4SectionBalance}</Text>
          <Controller
            control={control}
            name="balance"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.o4BalancePlaceholder}
                placeholderTextColor={Colors.dark.text3}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            )}
          />
          {errors.balance && (
            <Animated.Text entering={errorEntering} exiting={errorExiting} style={styles.errorText}>
              {errors.balance.message}
            </Animated.Text>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>{Strings.o4SectionColor}</Text>
          <View style={styles.colorRow}>
            {AccountColors.map((color) => (
              <Pressable
                key={color}
                onPress={() => form.setValue('selected_color', color)}
                style={styles.colorDotWrap}
              >
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorDotSelected,
                  ]}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {isCreditCard && (
          <Animated.View entering={ccEntering} exiting={ccExiting} style={styles.ccBlock}>
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionRevolving}</Text>
              <Controller
                control={control}
                name="revolving_balance"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4RevolvingPlaceholder}
                    placeholderTextColor={Colors.dark.text3}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                )}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionLimit}</Text>
              <Controller
                control={control}
                name="credit_limit"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={Strings.o4CreditLimitPlaceholder}
                    placeholderTextColor={Colors.dark.text3}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                )}
              />
              {errors.credit_limit && (
                <Animated.Text
                  entering={errorEntering}
                  exiting={errorExiting}
                  style={styles.errorText}
                >
                  {errors.credit_limit.message}
                </Animated.Text>
              )}
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionMinPayment}</Text>
              <Controller
                control={control}
                name="min_payment"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4MinPaymentPlaceholder}
                    placeholderTextColor={Colors.dark.text3}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                )}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionDueDay}</Text>
              <Controller
                control={control}
                name="due_day"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4DueDayPlaceholder}
                    placeholderTextColor={Colors.dark.text3}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={styles.input}
                  />
                )}
              />
            </View>
            <View style={[styles.fieldGroup, styles.interestRow]}>
              <Text style={styles.interestLabel}>{Strings.o4InterestLabel}</Text>
              <Pressable
                onPress={() => form.setValue('interest_tracking', !interestTracking)}
                style={[
                  styles.togglePill,
                  interestTracking ? styles.pillActive : styles.pillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: interestTracking ? Colors.shared.cairoGold : Colors.dark.text2 },
                  ]}
                >
                  {interestTracking ? Strings.o4InterestOn : Strings.o4InterestOff}
                </Text>
              </Pressable>
            </View>
            {interestTracking && (
              <Animated.View entering={aprEntering} exiting={aprExiting} style={styles.fieldGroup}>
                <Text style={styles.sectionLabel}>{Strings.o4SectionApr}</Text>
                <Controller
                  control={control}
                  name="apr"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder={Strings.o4AprPlaceholder}
                      placeholderTextColor={Colors.dark.text3}
                      keyboardType="decimal-pad"
                      style={styles.input}
                    />
                  )}
                />
                {errors.apr && (
                  <Animated.Text
                    entering={errorEntering}
                    exiting={errorExiting}
                    style={styles.errorText}
                  >
                    {errors.apr.message}
                  </Animated.Text>
                )}
              </Animated.View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.ctaBar}>
        <Animated.View style={btnAnim}>
          <Pressable
            onPress={() => {
              triggerBtnPress();
              handleSave();
            }}
            disabled={isSubmitting}
            style={[styles.ctaPress, isSubmitting && styles.ctaPressDisabled]}
          >
            <LinearGradient
              colors={[Colors.shared.cairoGold, Colors.dark.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>{Strings.u4Cta}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
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
  back: {
    width: Size.backBtn,
    height: Size.backBtn,
    borderRadius: Spacing.sm,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  headerSpacer: { width: Size.backBtn, height: Size.backBtn },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md },
  sectionLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.micro,
    color: Colors.shared.cairoGold,
    letterSpacing: 1,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pillActive: { borderColor: Colors.shared.cairoGold, backgroundColor: 'rgba(201,151,58,0.08)' },
  pillInactive: { borderColor: Colors.dark.border, backgroundColor: Colors.dark.surface },
  fieldGroup: { paddingTop: Spacing.xxs },
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
  currencyRow: { flexDirection: 'row', gap: Spacing.xs },
  currencyPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyText: { fontFamily: FontFamily.soraBold, fontSize: Type.body },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  colorDotWrap: { padding: Spacing.xxs },
  colorDot: { width: Size.colorDot, height: Size.colorDot, borderRadius: Size.colorDot / 2 },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: Colors.shared.cairoGold,
    transform: [{ scale: 1.1 }],
  },
  ccBlock: { paddingTop: Spacing.xxs },
  interestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  interestLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  togglePill: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minWidth: Size.backBtn + Spacing.xs,
    alignItems: 'center',
  },
  toggleText: { fontFamily: FontFamily.soraBold, fontSize: Type.caption, letterSpacing: 0.5 },
  ctaBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.surface,
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  ctaPress: { width: '100%', borderRadius: Radius.cta, overflow: 'hidden' },
  ctaPressDisabled: { opacity: 0.5 },
  cta: {
    height: Size.ctaHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.cta,
  },
  ctaText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
  errorText: {
    color: Colors.dark.negative,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    marginTop: Spacing.xxs,
  },
});
