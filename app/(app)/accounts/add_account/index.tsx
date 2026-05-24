import React from 'react';

import { FeatureFlags } from '@/constants/feature_flags';
import AddAccountAppScreenV1 from '@/screens/accounts/add_account';
import AddAccountAppScreenV2 from '@/screens/accounts_v2/add_account';

export default function AddAccountRoute() {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentional feature-flag guard; removed in §9a cleanup
  return FeatureFlags.newAccounts ? <AddAccountAppScreenV2 /> : <AddAccountAppScreenV1 />;
}
