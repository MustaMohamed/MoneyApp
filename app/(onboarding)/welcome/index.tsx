import React from 'react';

import { FeatureFlags } from '@/constants/feature_flags';
import WelcomeScreenV1 from '@/screens/onboarding/welcome';
import WelcomeScreenV2 from '@/screens/onboarding_v2/welcome';

export default function WelcomeRoute() {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentional feature-flag guard; will be removed when §2 ships
  return FeatureFlags.newOnboarding ? <WelcomeScreenV2 /> : <WelcomeScreenV1 />;
}
