import { Redirect, Stack, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

import { Colors } from '@/constants/theme';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';

export { RouteErrorFallback as ErrorBoundary } from '@/modules/navigation/components/route_error_fallback';

export type OnboardingStackParams = {
  welcome: undefined;
  // Expo Router params are strings on the wire; readers compare with `=== 'true'`.
  add_account: { isAddingMore?: 'true' };
  more_accounts: undefined;
  ready: undefined;
};

export default function OnboardingLayout() {
  const complete = useOnboardingStore((s) => s.complete);
  const segments = useSegments();

  // Without this, system back hits `exitApp()`: every route is a replace, so depth is 1.
  // Route identity, not the persisted step: add-more N2 sits on `add_account` while step is N3.
  // Registered above the `complete` early return so the hook always runs.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => segments[segments.length - 1] !== 'welcome',
    );
    return () => subscription.remove();
  }, [segments]);

  if (complete) return <Redirect href="/dashboard" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // 'fade' avoids the Fabric back-flicker on Android that 'slide_from_right' triggers.
        animation: 'fade',
        animationTypeForReplace: 'pop',
        freezeOnBlur: true,
        contentStyle: { backgroundColor: Colors.dark.bg },
        // iOS counterpart to the BackHandler lock above.
        gestureEnabled: false,
      }}
    />
  );
}
