import { Redirect, Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useOnboarding } from '@/store/onboarding.store';

export type OnboardingStackParams = {
  welcome: undefined;
  add_account: { isAddingMore?: boolean };
  more_accounts: undefined;
  ready: undefined;
};

export default function OnboardingLayout() {
  const { state } = useOnboarding();
  if (state.complete.value) return <Redirect href="/dashboard" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // 'fade' is the most reliable transition under the New Architecture
        // on Android — slide_from_right was triggering the upstream Fabric
        // back-flicker bug (react-native-screens#2605/#3483, expo#33647,
        // react-navigation#12377). Welcome already used 'fade' per spec, so
        // applying it globally keeps the launch transition unchanged and
        // makes inter-step transitions smoother on the new arch.
        animation: 'fade',
        animationTypeForReplace: 'pop',
        freezeOnBlur: true,
        contentStyle: { backgroundColor: Colors.dark.bg },
      }}
    />
  );
}
