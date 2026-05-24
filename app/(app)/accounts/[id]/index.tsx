import React from 'react';

import { FeatureFlags } from '@/constants/feature_flags';
import AccountDetailScreenV1 from '@/screens/accounts/detail';
import AccountDetailScreenV2 from '@/screens/accounts_v2/detail';

export default function AccountDetailRoute() {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentional feature-flag guard; removed in §9a cleanup
  return FeatureFlags.newAccounts ? <AccountDetailScreenV2 /> : <AccountDetailScreenV1 />;
}
