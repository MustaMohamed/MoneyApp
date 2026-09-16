import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Typography } from 'heroui-native';
import React from 'react';
import { Controller } from 'react-hook-form';
import Animated from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { FormLabelText } from '@/components/ui/form_label_text';
import { Input } from '@/components/ui/input';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { OnboardingFooter } from '@/modules/onboarding/components/onboarding_shell/onboarding_footer';
import { useKeyboardLiftAnim } from '@/modules/onboarding/components/onboarding_shell/onboarding_shell.anim';
import { formatCurrencyParts } from '@/utils/format_amount';

import { AccountColorField } from '../../../components/account_form/account_color_field';
import { FIELD_MESSAGE_TEXT_LINE_HEIGHT } from '../../../components/account_form/account_form.geometry';
import {
  FieldMessageRail,
  FieldMessageTrack,
} from '../../../components/account_form/field_message_rail';
import { useEditAccount } from './edit_account.hook';

// HeroUI's disabled field only halves its opacity; D1's read-only box is surface, separator border and 70% text, fully opaque.
const LOCKED_FIELD_CLASS =
  'bg-surface border-separator android:border-separator text-foreground/70 disabled:opacity-100';

// An empty rail is shorter than a one-line error, so the helperless name rail reserves the error's height.
const NAME_RAIL_MIN_HEIGHT = Math.max(
  Size.fieldMessageTrack,
  Size.fieldRailTextInset + FIELD_MESSAGE_TEXT_LINE_HEIGHT,
);

const LOCK_GLYPH = (
  <MaterialCommunityIcons name="lock-outline" size={Size.iconSm} color={CoreTokens.text2} />
);

export default function EditAccountScreen() {
  const { state, form, submit, onBack } = useEditAccount();
  const keyboardLift = useKeyboardLiftAnim();
  const { account, saving, statusMessage } = state;

  if (!account) {
    return (
      <Screen>
        <StackHeader title={Strings.editAccountTitle} onBack={onBack} />
      </Screen>
    );
  }

  const isCreditCard = account.type === AccountType.CreditCard;

  return (
    <Screen>
      <StackHeader title={Strings.editAccountTitle} onBack={onBack} />

      <ScreenScroll
        contentContainerStyle={{
          paddingHorizontal: Spacing.md,
          paddingTop: Spacing.md,
          paddingBottom: Spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <FormLabelText label={Strings.editAccountNameLabel} />
        <Controller
          control={form.control}
          name="name"
          render={({ field: { value, onChange, onBlur }, fieldState }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              maxLength={30}
              isInvalid={fieldState.invalid}
              accessibilityLabel={Strings.editAccountNameLabel}
            />
          )}
        />
        <Box style={{ minHeight: NAME_RAIL_MIN_HEIGHT }}>
          <FieldMessageRail control={form.control} name="name" />
        </Box>

        <Box className="pt-1">
          <Controller
            control={form.control}
            name="color"
            render={({ field: { value, onChange } }) => (
              <AccountColorField
                ownerId="accounts/edit_account"
                label={Strings.editAccountColorLabel}
                value={value}
                onChange={onChange}
              />
            )}
          />
          <FieldMessageTrack />
        </Box>

        <Box className="pt-1" style={{ flexDirection: 'row', gap: Spacing.xs }}>
          <Box style={{ flex: 1 }}>
            <FormLabelText label={Strings.editAccountTypeLabel} />
            <Input
              value={ACCOUNT_TYPE_LABELS[account.type]}
              isDisabled
              className={LOCKED_FIELD_CLASS}
              accessibilityLabel={Strings.editAccountTypeLabel}
              suffix={LOCK_GLYPH}
            />
            <FieldMessageTrack helper={isCreditCard ? undefined : Strings.editAccountTypeHelper} />
          </Box>
          <Box style={{ flex: 1 }}>
            <FormLabelText label={Strings.accountCurrencyLabel} />
            <Input
              value={account.currency}
              isDisabled
              className={LOCKED_FIELD_CLASS}
              accessibilityLabel={Strings.accountCurrencyLabel}
              suffix={LOCK_GLYPH}
            />
            <FieldMessageTrack />
          </Box>
        </Box>

        {isCreditCard ? null : (
          <Box className="pt-1">
            <FormLabelText label={Strings.accountBalanceLabel} />
            <Input
              value={formatCurrencyParts(account.opening_balance, account.currency).value}
              isDisabled
              className={LOCKED_FIELD_CLASS}
              accessibilityLabel={Strings.accountBalanceLabel}
              suffix={
                <Box style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                  <Typography
                    className="font-sora text-content-secondary"
                    style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
                  >
                    {account.currency}
                  </Typography>
                  {LOCK_GLYPH}
                </Box>
              }
            />
            <FieldMessageTrack helper={Strings.editAccountBalanceHelper} />
          </Box>
        )}
      </ScreenScroll>

      <Animated.View style={keyboardLift}>
        <OnboardingFooter
          footnote={Strings.editAccountFootnote}
          message={statusMessage}
          cta={
            <Button
              variant="primary"
              flat
              label={Strings.editAccountCta}
              loadingLabel={Strings.u4CtaBusy}
              isDisabled={saving}
              isLoading={saving}
              onPress={() => void submit()}
            />
          }
        />
      </Animated.View>
    </Screen>
  );
}
