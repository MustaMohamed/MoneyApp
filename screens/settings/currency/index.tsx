import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Controller } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { useCurrencyScreen } from './currency.hook';
import { useCurrencyScreenAnim } from './currency.anim';

export default function CurrencyScreen() {
  const { state, setManualPanelOpen, form, handleFetchRate, handleSaveManualRate } =
    useCurrencyScreen();
  const { rate, lastFetched, isManualOverride, isManualPanelOpen, isFetching, isSaving, fetchError } =
    state;
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
    <Screen>
      <ScreenScroll showsVerticalScrollIndicator={false}>
        {/* Rate card */}
        <View className="mx-4 mt-4 bg-surface rounded-2xl p-5 border border-border">
          <Text className="text-muted text-xs font-inter-medium uppercase tracking-wider mb-1">
            {Strings.currencyRateLabel}
          </Text>
          <Text
            className={`font-sora-bold text-4xl ${isManualOverride ? 'text-accent' : 'text-foreground'}`}
          >
            {rate.toFixed(2)}
          </Text>
          <Text className="text-muted text-xs font-inter-regular mt-1">
            {Strings.currencyRateSub}
          </Text>
          {isManualOverride && (
            <View className="self-start mt-2 bg-default border border-accent rounded-full px-2 py-0.5">
              <Text className="text-accent text-xs font-sora-semi">
                {Strings.currencyManualLabel}
              </Text>
            </View>
          )}
          <Text className="text-muted text-xs font-inter-regular mt-3">
            {Strings.currencyLastFetched}: {formattedDate}
          </Text>
        </View>

        {/* Refresh Rate button — secondary (outlined) */}
        <View className="mx-4 mt-3">
          <Button
            label={Strings.currencyFetchCta}
            variant="secondary"
            onPress={handleFetchRate}
            isDisabled={isFetching}
            isLoading={isFetching}
          />
        </View>

        {/* Fetch error message */}
        {fetchError !== '' && (
          <Text className="text-danger text-sm font-inter-regular mx-4 mt-2">
            {fetchError}
          </Text>
        )}

        {/* Manual override toggle row */}
        <Pressable
          onPress={() => setManualPanelOpen(!isManualPanelOpen)}
          className="mx-4 mt-2 bg-surface rounded-xl border border-border"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 }}
        >
          <View style={{ flex: 1 }}>
            <Text className="text-foreground font-inter-medium text-base">
              {Strings.currencyManualLabel}
            </Text>
            <Text className="text-muted text-xs font-inter-regular mt-0.5">
              {Strings.currencyManualSub}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={isManualPanelOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={Colors.dark.text2}
          />
        </Pressable>

        {/* Manual override panel — animated expansion (anim unchanged) */}
        {isManualPanelOpen && (
          <Animated.View
            entering={panelEntering}
            exiting={panelExiting}
            className="mx-4 mt-2 bg-surface rounded-xl p-4 border border-border"
          >
            <Text className="text-accent text-xs font-sora-bold uppercase tracking-widest mb-2">
              {Strings.currencyRateLabel}
            </Text>
            <Controller
              control={control}
              name="rate"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  isInvalid={!!errors.rate}
                  helperText={errors.rate?.message}
                />
              )}
            />
            {/* Save Rate button — primary (gold gradient) */}
            <View className="mt-4">
              <Button
                label={Strings.currencySaveCta}
                variant="primary"
                onPress={handleSaveManualRate}
                isDisabled={isSaving}
                isLoading={isSaving}
              />
            </View>
          </Animated.View>
        )}

        {/* Footer note — EGP immutability */}
        <Text className="text-muted text-xs font-inter-regular text-center mx-6 mt-6 mb-8">
          {Strings.currencyFooterNote}
        </Text>
      </ScreenScroll>
    </Screen>
  );
}
