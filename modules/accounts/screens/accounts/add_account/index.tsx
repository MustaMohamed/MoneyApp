import { Switch, Text } from 'heroui-native';
import React from 'react';
import { Controller, useWatch } from 'react-hook-form';
import Animated from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { ColorSwatchPicker } from '@/components/ui/color_swatch_picker';
import { FormErrorText } from '@/components/ui/form_error_text';
import { FormSectionLabel } from '@/components/ui/form_section_label';
import { Input } from '@/components/ui/input';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CurrencySelector } from '@/modules/currency';

import { TYPE_OPTIONS, TypePill } from '../../../components/account_type_pill';
import { useAddAccountAnim } from './add_account.anim';
import { ACCOUNT_COLORS, useAddAccountApp } from './add_account.hook';

export default function AddAccountAppScreen() {
  const { form, handleSave, onBack } = useAddAccountApp();
  const { btnAnim, triggerBtnPress, ccEntering, ccExiting, aprEntering, aprExiting } =
    useAddAccountAnim();
  const {
    control,
    formState: { errors, isSubmitting },
  } = form;
  const selectedType = useWatch({ control, name: 'selected_type' });
  const selectedCurrency = useWatch({ control, name: 'currency' });
  const interestTracking = useWatch({ control, name: 'interest_tracking' });
  const isCreditCard = selectedType === AccountType.CreditCard;

  return (
    <Screen>
      <StackHeader title={Strings.u4Title} onBack={onBack} />

      <ScreenScroll
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account Type */}
        <FormSectionLabel>{Strings.o4SectionType}</FormSectionLabel>
        <Box style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <TypePill
              key={opt.type}
              option={opt}
              isSelected={selectedType === opt.type}
              onSelect={() => form.setValue('selected_type', opt.type, { shouldValidate: true })}
            />
          ))}
        </Box>

        {/* Account Name */}
        <Box className="pt-1">
          <FormSectionLabel>{Strings.o4SectionName}</FormSectionLabel>
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.o4NamePlaceholder}
                maxLength={30}
                isInvalid={!!errors.name}
              />
            )}
          />
          <FormErrorText message={errors.name?.message} />
        </Box>

        {/* Currency */}
        <Box className="pt-1">
          <FormSectionLabel>{Strings.o4SectionCurrency}</FormSectionLabel>
          <CurrencySelector
            value={selectedCurrency}
            onChange={(c) => form.setValue('currency', c)}
          />
        </Box>

        {/* Balance */}
        <Box className="pt-1">
          <FormSectionLabel>{Strings.o4SectionBalance}</FormSectionLabel>
          <Controller
            control={control}
            name="balance"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.o4BalancePlaceholder}
                keyboardType="decimal-pad"
                isInvalid={!!errors.balance}
              />
            )}
          />
          <FormErrorText message={errors.balance?.message} />
        </Box>

        {/* Color picker */}
        <Box className="pt-1">
          <FormSectionLabel>{Strings.o4SectionColor}</FormSectionLabel>
          <Controller
            control={control}
            name="selected_color"
            render={({ field: { value, onChange } }) => (
              <ColorSwatchPicker colors={ACCOUNT_COLORS} value={value} onChange={onChange} />
            )}
          />
        </Box>

        {/* CC conditional fields */}
        {isCreditCard && (
          <Animated.View entering={ccEntering} exiting={ccExiting} className="pt-1">
            {/* Revolving Balance */}
            <Box className="pt-1">
              <FormSectionLabel>{Strings.o4SectionRevolving}</FormSectionLabel>
              <Controller
                control={control}
                name="revolving_balance"
                render={({ field: { value, onChange } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4RevolvingPlaceholder}
                    keyboardType="decimal-pad"
                  />
                )}
              />
            </Box>

            {/* Credit Limit */}
            <Box className="pt-1">
              <FormSectionLabel>{Strings.o4SectionLimit}</FormSectionLabel>
              <Controller
                control={control}
                name="credit_limit"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={Strings.o4CreditLimitPlaceholder}
                    keyboardType="decimal-pad"
                    isInvalid={!!errors.credit_limit}
                  />
                )}
              />
              <FormErrorText message={errors.credit_limit?.message} />
            </Box>

            {/* Min Payment */}
            <Box className="pt-1">
              <FormSectionLabel>{Strings.o4SectionMinPayment}</FormSectionLabel>
              <Controller
                control={control}
                name="min_payment"
                render={({ field: { value, onChange } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4MinPaymentPlaceholder}
                    keyboardType="decimal-pad"
                  />
                )}
              />
              <Text className="text-muted font-inter mt-1 text-[11px]">
                {Strings.o4MinPaymentHint}
              </Text>
            </Box>

            {/* Due Day */}
            <Box className="pt-1">
              <FormSectionLabel>{Strings.o4SectionDueDay}</FormSectionLabel>
              <Controller
                control={control}
                name="due_day"
                render={({ field: { value, onChange } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4DueDayPlaceholder}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                )}
              />
            </Box>

            {/* Interest Tracking */}
            <Box style={{ flexDirection: 'row' }} className="items-center justify-between py-3">
              <Text className="font-inter text-foreground text-[15px] font-semibold">
                {Strings.o4InterestLabel}
              </Text>
              <Switch
                isSelected={interestTracking}
                onSelectedChange={(v) => form.setValue('interest_tracking', v)}
                accessibilityLabel={Strings.o4InterestLabel}
              />
            </Box>

            {/* APR (when interest tracking ON) */}
            {interestTracking && (
              <Animated.View entering={aprEntering} exiting={aprExiting} className="pt-1">
                <FormSectionLabel>{Strings.o4SectionApr}</FormSectionLabel>
                <Controller
                  control={control}
                  name="apr"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder={Strings.o4AprPlaceholder}
                      keyboardType="decimal-pad"
                      isInvalid={!!errors.apr}
                    />
                  )}
                />
                <Text className="text-muted font-inter mt-1 text-[11px]">{Strings.o4AprHint}</Text>
                <FormErrorText message={errors.apr?.message} />
              </Animated.View>
            )}
          </Animated.View>
        )}
      </ScreenScroll>

      {/* CTA bar */}
      <Box className="border-separator border-t px-4 pt-2 pb-6">
        <Animated.View style={btnAnim}>
          <Button
            variant="primary"
            label={Strings.u4Cta}
            onPress={() => {
              triggerBtnPress();
              void handleSave();
            }}
            disabled={isSubmitting}
          />
        </Animated.View>
      </Box>
    </Screen>
  );
}
