import { EmptyState } from '@/components/empty_states';
import { Strings } from '@/constants/strings';

interface CommitmentsEmptyStateProps {
  onAdd: () => void;
}

export function CommitmentsEmptyState({ onAdd }: CommitmentsEmptyStateProps) {
  return (
    <EmptyState variant="commitments" onAction={onAdd} actionLabel={Strings.commitmentsEmptyCta} />
  );
}
