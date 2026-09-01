import React from 'react';
import Animated from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { FormErrorText } from '@/components/ui/form_error_text';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';

import { AccountForm } from '../../../components/account_form/account_form';
import { useAddAccountAnim } from './add_account.anim';
import { useAddAccountApp } from './add_account.hook';

export default function AddAccountAppScreen() {
  const { form, handleSave, onBack, state } = useAddAccountApp();
  const { btnAnim, triggerBtnPress } = useAddAccountAnim();

  return (
    <Screen>
      <StackHeader title={Strings.u4Title} onBack={onBack} />

      <ScreenScroll
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <AccountForm form={form} ownerId="accounts/add_account" />
      </ScreenScroll>

      <Box className="border-separator border-t px-4 pt-2 pb-6">
        <FormErrorText message={state.errorMessage} />
        <Animated.View style={btnAnim}>
          <Button
            variant="primary"
            label={Strings.u4Cta}
            onPress={() => {
              triggerBtnPress();
              void handleSave();
            }}
            isDisabled={state.saving}
            isLoading={state.saving}
            loadingLabel={Strings.u4CtaBusy}
          />
        </Animated.View>
      </Box>
    </Screen>
  );
}
