import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Controller } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { useCurrencyScreen } from './currency.hook';
import { useCurrencyScreenAnim } from './currency.anim';

export default function CurrencyScreen() {
  const { state, setManualPanelOpen, form, handleFetchRate, handleSaveManualRate, goBack } =
    useCurrencyScreen();
  const { rate, lastFetched, isManualOverride, isManualPanelOpen, isFetching, isSaving } = state;
  const { panelEntering, panelExiting } = useCurrencyScreenAnim();
  const {
    control,
    formState: { errors },
  } = form;

  const formattedDate = lastFetched
    ? new Date(lastFetched).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : Strings.currencyNeverFetched;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={Size.iconBack}
            color={Colors.dark.text2}
          />
        </Pressable>
        <Text style={styles.title}>{Strings.currencyScreenTitle}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.rateCard}>
          <Text style={styles.rateLabel}>{Strings.currencyRateLabel}</Text>
          <Text style={styles.rateValue}>{rate.toFixed(2)}</Text>
          <Text style={styles.rateSub}>{Strings.currencyRateSub}</Text>
          {isManualOverride && (
            <View style={styles.manualBadge}>
              <Text style={styles.manualBadgeText}>{Strings.currencyManualLabel}</Text>
            </View>
          )}
          <Text style={styles.fetchedAt}>
            {Strings.currencyLastFetched}: {formattedDate}
          </Text>
        </View>

        <Pressable
          onPress={handleFetchRate}
          disabled={isFetching}
          style={[styles.refreshBtn, isFetching && styles.disabled]}
        >
          <MaterialCommunityIcons
            name={isFetching ? 'loading' : 'refresh'}
            size={Size.iconSm}
            color={Colors.shared.cairoGold}
          />
          <Text style={styles.refreshText}>{Strings.currencyFetchCta}</Text>
        </Pressable>

        <Pressable
          onPress={() => setManualPanelOpen(!isManualPanelOpen)}
          style={styles.manualToggleRow}
        >
          <View>
            <Text style={styles.manualLabel}>{Strings.currencyManualLabel}</Text>
            <Text style={styles.manualSub}>{Strings.currencyManualSub}</Text>
          </View>
          <MaterialCommunityIcons
            name={isManualPanelOpen ? 'chevron-up' : 'chevron-down'}
            size={Size.iconSm}
            color={Colors.dark.text2}
          />
        </Pressable>

        {isManualPanelOpen && (
          <Animated.View entering={panelEntering} exiting={panelExiting} style={styles.manualPanel}>
            <Text style={styles.fieldLabel}>{Strings.currencyRateLabel}</Text>
            <Controller
              control={control}
              name="rate"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  style={styles.input}
                  placeholderTextColor={Colors.dark.text3}
                />
              )}
            />
            {errors.rate && <Text style={styles.error}>{errors.rate.message}</Text>}
            <Pressable
              onPress={handleSaveManualRate}
              disabled={isSaving}
              style={[styles.savePress, isSaving && styles.disabled]}
            >
              <LinearGradient
                colors={[Colors.shared.cairoGold, Colors.dark.gold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveGradient}
              >
                <Text style={styles.saveText}>{Strings.currencySaveCta}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
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
  backBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    borderRadius: Spacing.sm,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: FontFamily.soraBold, fontSize: Type.subhead, color: Colors.dark.text1 },
  scroll: { flex: 1 },
  rateCard: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  rateLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  rateValue: { fontFamily: FontFamily.soraBold, fontSize: Type.hero, color: Colors.dark.gold },
  rateSub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    marginTop: Spacing.xxs,
  },
  manualBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.shared.cairoGold,
  },
  manualBadgeText: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.micro,
    color: Colors.shared.cairoGold,
  },
  fetchedAt: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginTop: Spacing.sm,
  },
  refreshBtn: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  refreshText: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.shared.cairoGold,
  },
  manualToggleRow: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  manualLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  manualSub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    marginTop: 2,
  },
  manualPanel: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
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
    backgroundColor: Colors.dark.surfaceEl,
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
  savePress: { marginTop: Spacing.md, borderRadius: Radius.cta, overflow: 'hidden' },
  disabled: { opacity: 0.5 },
  saveGradient: {
    height: Size.ctaHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.cta,
  },
  saveText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
  bottomPad: { height: Spacing.xxl },
});
