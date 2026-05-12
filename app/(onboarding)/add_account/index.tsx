import React from 'react';
import { FeatureFlags } from '@/constants/feature_flags';
import AddAccountScreenV1 from '@/screens/onboarding/add_account';
import AddAccountScreenV2 from '@/screens/onboarding_v2/add_account';

export default function AddAccountRoute() {
  return FeatureFlags.newOnboarding ? <AddAccountScreenV2 /> : <AddAccountScreenV1 />;
}
