import { FeatureFlags } from '@/constants/feature_flags';
import CommitmentsScreenV2 from '@/screens/commitments';
import CommitmentsScreenLegacy from '@/screens/commitments_legacy';

export default function CommitmentsRoute() {
  return FeatureFlags.newCommitments ? <CommitmentsScreenV2 /> : <CommitmentsScreenLegacy />;
}
