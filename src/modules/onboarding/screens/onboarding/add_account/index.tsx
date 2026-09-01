import React from 'react';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { ScreenScroll } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { AccountForm } from '@/modules/accounts/components/account_form/account_form';
import { OnboardingShell } from '@/modules/onboarding/components/onboarding_shell';

import { useAddAccountAnim } from './add_account.anim';
import { useAddAccount } from './add_account.hook';

export default function AddAccountScreen() {
  const { form, handleSave, onBack, isAddingMore, state } = useAddAccount();
  const { btnAnim, triggerBtnPress } = useAddAccountAnim();

  return (
    <OnboardingShell
      // Add-more keeps N3's chrome: the persisted step never moved off N3 (mockup.html:2046), so "first account" / step 2 would contradict it.
      step={isAddingMore ? 3 : 2}
      title={isAddingMore ? Strings.n2AddMoreHeaderTitle : Strings.n2HeaderTitle}
      onBack={() => {
        // onBack resolves on failure inside runOnboardingTransition; void discards no rejection.
        void onBack();
      }}
      footnote={Strings.n2Footnote}
      statusMessage={state.statusMessage}
      cta={
        <Animated.View style={btnAnim}>
          <Button
            variant="primary"
            flat
            label={Strings.n2Cta}
            onPress={() => {
              triggerBtnPress();
              void handleSave();
            }}
            isDisabled={state.saving}
            isLoading={state.saving}
            loadingLabel={Strings.n2CtaBusy}
          />
        </Animated.View>
      }
    >
      <ScreenScroll
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <AccountForm form={form} ownerId="onboarding/add_account" />
      </ScreenScroll>
    </OnboardingShell>
  );
}
