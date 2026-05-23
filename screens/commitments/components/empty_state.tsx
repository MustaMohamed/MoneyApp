import { EmptyState } from '@/components/ui/empty_state';

interface CommitmentsEmptyStateProps {
  onAdd: () => void;
}

export function CommitmentsEmptyState({ onAdd }: CommitmentsEmptyStateProps) {
  return <EmptyState variant="commitments" onAction={onAdd} />;
}
