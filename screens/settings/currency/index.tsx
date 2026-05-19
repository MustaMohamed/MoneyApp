import { Accordion } from 'heroui-native';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

import { useCurrencyScreen } from './currency.hook';

export default function CurrencyScreen() {
  const { state, form, handleFetchRate, handleSaveManualRate } = useCurrencyScreen();
  const { rate, lastFetched, isManualOverride, isFetching, isSaving, fetchError } = state;
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
    <Screen edges={['bottom']}>
      <ScreenScroll showsVerticalScrollIndicator={false}>
        {/* Rate card */}
        <View className="bg-surface border-border mx-4 mt-4 rounded-2xl border p-5">
          <Text className="text-muted font-inter-medium mb-1 text-xs tracking-wider uppercase">
            {Strings.currencyRateLabel}
          </Text>
          <Text
            className={`font-sora-bold text-4xl ${isManualOverride ? 'text-accent' : 'text-foreground'}`}
          >
            {rate.toFixed(2)}
          </Text>
          <Text className="text-muted font-inter-regular mt-1 text-xs">
            {Strings.currencyRateSub}
          </Text>
          {isManualOverride && (
            <View className="bg-default border-accent mt-2 self-start rounded-full border px-2 py-0.5">
              <Text className="text-accent font-sora-semi text-xs">
                {Strings.currencyManualLabel}
              </Text>
            </View>
          )}
          <Text className="text-muted font-inter-regular mt-3 text-xs">
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
          <Text className="text-danger font-inter-regular mx-4 mt-2 text-sm">{fetchError}</Text>
        )}

        {/* Manual override — HeroUI Accordion */}
        <View className="mx-4 mt-2">
          <Accordion variant="surface">
            <Accordion.Item value="manual-override">
              <Accordion.Trigger>
                <View style={{ flex: 1 }}>
                  <Text className="text-foreground font-inter-medium text-base">
                    {Strings.currencyManualLabel}
                  </Text>
                  <Text className="text-muted font-inter-regular mt-0.5 text-xs">
                    {Strings.currencyManualSub}
                  </Text>
                </View>
                <Accordion.Indicator />
              </Accordion.Trigger>
              <Accordion.Content>
                <Text className="text-accent font-sora-bold mb-2 text-xs tracking-widest uppercase">
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
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </View>

        {/* Footer note — EGP immutability */}
        <Text className="text-muted font-inter-regular mx-6 mt-6 mb-8 text-center text-xs">
          {Strings.currencyFooterNote}
        </Text>
      </ScreenScroll>
    </Screen>
  );
}
