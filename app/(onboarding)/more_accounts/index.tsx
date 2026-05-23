import React from 'react';

import { FeatureFlags } from '@/constants/feature_flags';
import MoreAccountsScreenV1 from '@/screens/onboarding/more_accounts';
import MoreAccountsScreenV2 from '@/screens/onboarding_v2/more_accounts';

export default function MoreAccountsRoute() {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentional feature-flag guard; will be removed when §2 ships
  return FeatureFlags.newOnboarding ? <MoreAccountsScreenV2 /> : <MoreAccountsScreenV1 />;
}
