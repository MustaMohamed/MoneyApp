import React from 'react';

import { FeatureFlags } from '@/constants/feature_flags';
import ReadyScreenV1 from '@/screens/onboarding/ready';
import ReadyScreenV2 from '@/screens/onboarding_v2/ready';

export default function ReadyRoute() {
  return FeatureFlags.newOnboarding ? <ReadyScreenV2 /> : <ReadyScreenV1 />;
}
