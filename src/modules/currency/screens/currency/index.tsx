import { Accordion, Card, Chip, Typography } from 'heroui-native';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormErrorText } from '@/components/ui/form_error_text';
import { Input } from '@/components/ui/input';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';
import { EXCHANGE_RATE_DECIMALS, formatAmount } from '@/utils/format_amount';

import { useCurrencyScreen } from './currency.hook';

export default function CurrencyScreen() {
  const { state, form, handleFetchRate, handleSaveManualRate } = useCurrencyScreen();
  const { rate, isManualOverride, isFetching, isSaving, fetchError, saveError, formattedDate } =
    state;
  const {
    control,
    formState: { errors },
  } = form;

  return (
    <Screen edges={['bottom']}>
      <ScreenScroll showsVerticalScrollIndicator={false}>
        {/* Rate card */}
        <Card
          className="border-border mx-4 mt-4 rounded-2xl border p-0"
          style={{ elevation: 0, shadowOpacity: 0 }}
        >
          <Card.Body className="p-5">
            <Typography className="text-muted font-inter-medium mb-1 text-xs tracking-wider uppercase">
              {Strings.currencyRateLabel}
            </Typography>
            <Typography
              className={`font-sora-bold text-4xl ${isManualOverride ? 'text-accent' : 'text-foreground'}`}
            >
              {formatAmount(rate, EXCHANGE_RATE_DECIMALS)}
            </Typography>
            <Typography className="text-muted font-inter mt-1 text-xs">
              {Strings.currencyRateSub}
            </Typography>
            {isManualOverride && (
              <Chip color="accent" variant="soft" size="sm" className="mt-2 self-start">
                {Strings.currencyManualLabel}
              </Chip>
            )}
            <Typography className="text-muted font-inter mt-3 text-xs">
              {Strings.currencyLastFetched}: {formattedDate}
            </Typography>
          </Card.Body>
        </Card>

        {/* Refresh Rate button — secondary (outlined) */}
        <View className="mx-4 mt-3">
          <Button
            label={Strings.currencyFetchCta}
            variant="secondary"
            onPress={() => {
              void handleFetchRate();
            }}
            isDisabled={isFetching}
            isLoading={isFetching}
          />
        </View>

        <FormErrorText message={fetchError} className="mx-4 mt-2" />

        {/* Manual override — HeroUI Accordion */}
        <View className="mx-4 mt-2">
          <Accordion variant="surface">
            <Accordion.Item value="manual-override">
              <Accordion.Trigger>
                <View style={{ flex: 1 }}>
                  <Typography className="text-foreground font-inter-medium text-base">
                    {Strings.currencyManualLabel}
                  </Typography>
                  <Typography className="text-muted font-inter mt-0.5 text-xs">
                    {Strings.currencyManualSub}
                  </Typography>
                </View>
                <Accordion.Indicator />
              </Accordion.Trigger>
              <Accordion.Content>
                <Typography className="text-accent font-sora-bold mb-2 text-xs tracking-widest uppercase">
                  {Strings.currencyRateLabel}
                </Typography>
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
                    onPress={() => {
                      void handleSaveManualRate();
                    }}
                    isDisabled={isSaving}
                    isLoading={isSaving}
                  />
                </View>
                <View className="min-h-6 pt-1">
                  <FormErrorText message={saveError} />
                </View>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </View>

        {/* Footer note — EGP immutability */}
        <Typography className="text-muted font-inter mx-6 mt-6 mb-8 text-center text-xs">
          {Strings.currencyFooterNote}
        </Typography>
      </ScreenScroll>
    </Screen>
  );
}
