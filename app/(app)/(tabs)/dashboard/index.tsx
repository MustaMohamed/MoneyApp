import React from 'react';

import { FeatureFlags } from '@/constants/feature_flags';
import DashboardScreenV1 from '@/screens/dashboard';
import DashboardScreenV2 from '@/screens/dashboard_v2';

export default function DashboardRoute() {
  return FeatureFlags.newDashboard ? <DashboardScreenV2 /> : <DashboardScreenV1 />;
}
