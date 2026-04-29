import { Redirect, Stack } from 'expo-router';

import { useOnboardingStore } from '@/store/onboardingStore';

export type OnboardingStackParams = {
  welcome: undefined;
  currency: undefined;
  security: undefined;
  'add-account': { isAddingMore?: boolean };
  'more-accounts': undefined;
  ready: undefined;
};

export default function OnboardingLayout() {
  const complete = useOnboardingStore((s) => s.complete);
  if (complete) return <Redirect href="/dashboard" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationTypeForReplace: 'pop',
        // Keep blurred screens alive during the transition. Mitigates the
        // Fabric flicker on Android with the new architecture (RN screens
        // tracked under software-mansion/react-native-screens#2605, #3483
        // and expo/expo#33647).
        freezeOnBlur: true,
        contentStyle: { backgroundColor: '#0F1923' },
      }}
    >
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
    </Stack>
  );
}
