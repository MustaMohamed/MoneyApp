import React from 'react';

import { FeatureFlags } from '@/constants/feature_flags';
import ReadyScreenV1 from '@/screens/onboarding/ready';
import ReadyScreenV2 from '@/screens/onboarding_v2/ready';

export default function ReadyRoute() {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentional feature-flag guard; will be removed when §2 ships
  return FeatureFlags.newOnboarding ? <ReadyScreenV2 /> : <ReadyScreenV1 />;
}
