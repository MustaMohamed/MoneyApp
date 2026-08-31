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
  const {
    rate,
    isManualOverride,
    isFetching,
    isSaving,
    fetchError,
    rateWarning,
    isStoredRateImplausible,
    saveError,
    formattedDate,
    footerNote,
  } = state;
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
          style={{ boxShadow: 'none' }}
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

        {/* Manual override — HeroUI Accordion. Opens on mount when the STORED
            rate is out of band: the warning lives in this section's content, so
            collapsed-by-default meant a mount-time warning nobody could see.
            Uncontrolled on purpose — `defaultValue` is read once, so a user who
            collapses this stays collapsed. */}
        <View className="mx-4 mt-2">
          <Accordion
            variant="surface"
            defaultValue={isStoredRateImplausible ? 'manual-override' : undefined}
          >
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
                {/* Warning, not danger: nothing failed, the value saves either
                    way, and this describes the number in the field above it.
                    `FormErrorText` is the danger channel and would read as a
                    rejection. */}
                {rateWarning !== '' && (
                  <Typography className="text-warning font-inter mt-1 text-sm">
                    {rateWarning}
                  </Typography>
                )}
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

        {/* Footer note — names the base currency every figure is reported in,
            and that it is fixed. Composed in the hook from the onboarding
            store's base; this screen never reads a store. */}
        <Typography className="text-muted font-inter mx-6 mt-6 mb-8 text-center text-xs">
          {footerNote}
        </Typography>
      </ScreenScroll>
    </Screen>
  );
}
