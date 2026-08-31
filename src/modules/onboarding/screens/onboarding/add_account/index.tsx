import React from 'react';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { ScreenScroll } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';
import { AccountForm } from '@/modules/accounts/components/account_form/account_form';
import { OnboardingShell } from '@/modules/onboarding/components/onboarding_shell';

import { useAddAccountAnim } from './add_account.anim';
import { useAddAccount } from './add_account.hook';

export default function AddAccountScreen() {
  const { form, handleSave, onBack, state } = useAddAccount();
  const { btnAnim, triggerBtnPress } = useAddAccountAnim();

  return (
    <OnboardingShell
      step={2}
      title={Strings.n2HeaderTitle}
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <AccountForm form={form} ownerId="onboarding/add_account" />
      </ScreenScroll>
    </OnboardingShell>
  );
}
