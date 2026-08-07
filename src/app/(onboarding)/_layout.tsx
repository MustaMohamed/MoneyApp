import { Redirect, Stack, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

import { Colors } from '@/constants/theme';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';

export type OnboardingStackParams = {
  welcome: undefined;
  add_account: { isAddingMore?: boolean };
  more_accounts: undefined;
  ready: undefined;
};

export default function OnboardingLayout() {
  const complete = useOnboardingStore((s) => s.complete);
  const segments = useSegments();

  // System back is consumed on N2/N3/N4 and left alone on N1 — see MA-005
  // plan Decision 4. With every route replaced, onboarding's stack depth is
  // 1, so without this subscription BackHandler falls through to exitApp()
  // on N2/N3/N4, turning "go to the previous step" into "quit the app".
  // useSegments() rather than a store read: the add-more N2 deliberately
  // holds a persisted step of N3 while the mounted route is add_account, and
  // it is route identity — not the persisted step — that decides this.
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
        // iOS-only lever (react-native-screens/src/types.tsx:203-208) for
        // the same stack lock the BackHandler subscription above gives
        // Android; with every navigation a `replace`, there is usually
        // nothing to swipe back to, but "usually" is not "never".
        gestureEnabled: false,
      }}
    />
  );
}
