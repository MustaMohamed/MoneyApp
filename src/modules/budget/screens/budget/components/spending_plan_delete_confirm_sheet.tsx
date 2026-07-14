import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  planName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SpendingPlanDeleteConfirmSheet({
  isOpen,
  planName,
  busy,
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
