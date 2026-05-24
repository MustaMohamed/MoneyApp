import { FeatureFlags } from '@/constants/feature_flags';
import CommitmentsScreenV2 from '@/screens/commitments';
import CommitmentsScreenLegacy from '@/screens/commitments_legacy';

export default function CommitmentsRoute() {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentional feature-flag guard; will be removed when §8 ships
  return FeatureFlags.newCommitments ? <CommitmentsScreenV2 /> : <CommitmentsScreenLegacy />;
}
