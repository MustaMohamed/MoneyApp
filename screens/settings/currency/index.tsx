import { Controller } from 'react-hook-form';
import { View } from 'react-native';
import { Accordion } from 'heroui-native';

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

        {/* Manual override — HeroUI Accordion */}
        <View className="mx-4 mt-2">
          <Accordion variant="surface">
            <Accordion.Item value="manual-override">
              <Accordion.Trigger>
                <View style={{ flex: 1 }}>
                  <Text className="text-foreground font-inter-medium text-base">
                    {Strings.currencyManualLabel}
                  </Text>
                  <Text className="text-muted text-xs font-inter-regular mt-0.5">
                    {Strings.currencyManualSub}
                  </Text>
                </View>
                <Accordion.Indicator />
              </Accordion.Trigger>
              <Accordion.Content>
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
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </View>

        {/* Footer note — EGP immutability */}
        <Text className="text-muted text-xs font-inter-regular text-center mx-6 mt-6 mb-8">
          {Strings.currencyFooterNote}
        </Text>
      </ScreenScroll>
    </Screen>
  );
}
