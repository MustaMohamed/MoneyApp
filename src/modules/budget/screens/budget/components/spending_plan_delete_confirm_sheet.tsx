import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  planName: string;
  busy: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SpendingPlanDeleteConfirmSheet({
  isOpen,
  planName,
  busy,
  errorMessage,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <ConfirmSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      busy={busy}
      errorMessage={errorMessage}
      destructive
      title={Strings.budgetPlanDeleteConfirmTitle}
      body={Strings.budgetPlanDeleteConfirmBody(planName)}
      confirmLabel={Strings.budgetPlanDeleteConfirmConfirm}
      cancelLabel={Strings.budgetPlanDeleteConfirmCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
