import { FeatureFlags } from '@/constants/feature_flags';
import TransactionsScreenV1 from '@/screens/transactions';
import TransactionsScreenV2 from '@/screens/transactions_v2';

export default function TransactionsRoute() {
  return FeatureFlags.newTransactions ? <TransactionsScreenV2 /> : <TransactionsScreenV1 />;
}
