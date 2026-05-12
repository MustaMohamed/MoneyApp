import React from 'react';
import { Switch } from 'react-native';
import Animated from 'react-native-reanimated';
import { Controller, useWatch } from 'react-hook-form';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { cn } from 'heroui-native';

import { ProgressDots } from '@/components/progress_dots';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { AccountType, Currency } from '@/constants/enums';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import { useAddAccountV2, ACCOUNT_COLORS } from './add_account.hook';
import { useAddAccountAnim } from './add_account.anim';
import { TypePill, TYPE_OPTIONS } from './components/type_pill';

const CURRENCY_OPTIONS: Currency[] = [Currency.EGP, Currency.USD];

export default function AddAccountScreenV2() {
  const { form, handleSave, onBack } = useAddAccountV2();
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
    <Screen>
      {/* Header */}
      <Box
        style={{ flexDirection: 'row', height: 56 }}
        className="items-center justify-between px-4"
      >
        <Pressable
          onPress={onBack}
          className="w-9 h-9 rounded-[8px] bg-surface border border-border items-center justify-center"
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={CoreTokens.text2} />
        </Pressable>
        <Text variant="title" className="font-soraBold">
          {Strings.o4Title}
        </Text>
        <Box className="w-9 h-9" />
      </Box>

      <ProgressDots totalSteps={4} currentStep={2} />

      <ScreenScroll
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account Type */}
        <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">
          {Strings.o4SectionType}
        </Text>
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
          <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">
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
                placeholder={Strings.o4NamePlaceholder}
                maxLength={30}
                hasError={!!errors.name}
              />
            )}
          />
          {errors.name ? (
            <Animated.Text
              entering={errorEntering}
              exiting={errorExiting}
              className="text-negative font-inter text-[12px] mt-1"
            >
              {errors.name.message}
            </Animated.Text>
          ) : null}
        </Box>

        {/* Currency */}
        <Box className="pt-1">
          <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">
            {Strings.o4SectionCurrency}
          </Text>
          <Box style={{ flexDirection: 'row' }} className="gap-2">
            {CURRENCY_OPTIONS.map((code) => (
              <Pressable
                key={code}
                onPress={() => form.setValue('currency', code)}
                style={{ flex: 1 }}
                className={cn(
                  'py-3 px-3 rounded-[10px] border-[1.5px] items-center justify-center',
                  selectedCurrency === code
                    ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]'
                    : 'border-border bg-default',
                )}
              >
                <Text
                  variant="body"
                  className={cn(
                    'font-soraBold',
                    selectedCurrency === code ? 'text-gold-600' : 'text-muted',
                  )}
                >
                  {code}
                </Text>
              </Pressable>
            ))}
          </Box>
        </Box>

        {/* Balance */}
        <Box className="pt-1">
          <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">
            {Strings.o4SectionBalance}
          </Text>
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
                hasError={!!errors.balance}
              />
            )}
          />
          {errors.balance ? (
            <Animated.Text
              entering={errorEntering}
              exiting={errorExiting}
              className="text-negative font-inter text-[12px] mt-1"
            >
              {errors.balance.message}
            </Animated.Text>
          ) : null}
        </Box>

        {/* Color picker */}
        <Box className="pt-1">
          <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">
            {Strings.o4SectionColor}
          </Text>
          <Box style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
            {ACCOUNT_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => form.setValue('selected_color', color)}
                className="p-0.5"
              >
                <Box
                  className={cn(
                    'w-8 h-8 rounded-full',
                    selectedColor === color && 'border-2 border-gold-500 scale-110',
                  )}
                  style={{ backgroundColor: color }}
                />
              </Pressable>
            ))}
          </Box>
        </Box>

        {/* CC conditional fields */}
        {isCreditCard && (
          <Animated.View entering={ccEntering} exiting={ccExiting} className="pt-1">
            {/* Revolving Balance */}
            <Box className="pt-1">
              <Text
                variant="hint"
                className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest"
              >
                {Strings.o4SectionRevolving}
              </Text>
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
              <Text
                variant="hint"
                className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest"
              >
                {Strings.o4SectionLimit}
              </Text>
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
                    hasError={!!errors.credit_limit}
                  />
                )}
              />
              {errors.credit_limit ? (
                <Animated.Text
                  entering={errorEntering}
                  exiting={errorExiting}
                  className="text-negative font-inter text-[12px] mt-1"
                >
                  {errors.credit_limit.message}
                </Animated.Text>
              ) : null}
            </Box>

            {/* Min Payment */}
            <Box className="pt-1">
              <Text
                variant="hint"
                className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest"
              >
                {Strings.o4SectionMinPayment}
              </Text>
              <Controller
                control={control}
                name="min_payment"
                render={({ field: { value, onChange } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4MinPaymentPlaceholderV2}
                    keyboardType="decimal-pad"
                  />
                )}
              />
              <Text variant="caption" className="text-muted mt-1">
                {Strings.o4MinPaymentHint}
              </Text>
            </Box>

            {/* Due Day */}
            <Box className="pt-1">
              <Text
                variant="hint"
                className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest"
              >
                {Strings.o4SectionDueDay}
              </Text>
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

            {/* Interest Tracking — native Switch (spec §2.4) */}
            <Box style={{ flexDirection: 'row' }} className="items-center justify-between py-3">
              <Text variant="body" className="font-interSemi text-foreground">
                {Strings.o4InterestLabel}
              </Text>
              <Switch
                value={interestTracking}
                onValueChange={(v) => form.setValue('interest_tracking', v)}
                trackColor={{ false: CoreTokens.border, true: GoldTokens[600] }}
                thumbColor={CoreTokens.text1}
                ios_backgroundColor={CoreTokens.border}
                accessibilityRole="switch"
                accessibilityLabel={Strings.o4InterestLabel}
              />
            </Box>

            {/* APR (shown when interest tracking ON) */}
            {interestTracking && (
              <Animated.View entering={aprEntering} exiting={aprExiting} className="pt-1">
                <Text
                  variant="hint"
                  className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest"
                >
                  {Strings.o4SectionApr}
                </Text>
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
                      hasError={!!errors.apr}
                    />
                  )}
                />
                <Text variant="caption" className="text-muted mt-1">
                  {Strings.o4AprHint}
                </Text>
                {errors.apr ? (
                  <Animated.Text
                    entering={errorEntering}
                    exiting={errorExiting}
                    className="text-negative font-inter text-[12px] mt-1"
                  >
                    {errors.apr.message}
                  </Animated.Text>
                ) : null}
              </Animated.View>
            )}
          </Animated.View>
        )}
      </ScreenScroll>

      {/* CTA bar */}
      <Box className="border-t border-separator pt-2 px-4 pb-6">
        <Animated.View style={btnAnim}>
          <Button
            variant="primary"
            label={Strings.o4Cta}
            onPress={() => {
              triggerBtnPress();
              handleSave();
            }}
            disabled={isSubmitting}
          />
        </Animated.View>
      </Box>
    </Screen>
  );
}
