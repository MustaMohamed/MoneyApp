import React from 'react';

import { FeatureFlags } from '@/constants/feature_flags';
import MoreAccountsScreenV1 from '@/screens/onboarding/more_accounts';
import MoreAccountsScreenV2 from '@/screens/onboarding_v2/more_accounts';

export default function MoreAccountsRoute() {
  return FeatureFlags.newOnboarding ? <MoreAccountsScreenV2 /> : <MoreAccountsScreenV1 />;
}
