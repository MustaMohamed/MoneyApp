import { ConfirmDialog } from '@/components/ui/confirm_dialog';
import { Strings } from '@/constants/strings';
import type { AccountCommitmentRef } from '@/modules/commitments/database/commitments';
import { resolveAccountName } from '@/utils/account_name';

import type { Account } from '../../../../store/account.store';
import { resolveDeleteWarningBody } from './delete_confirmation.helpers';

interface DeleteConfirmationDialogProps {
  visible: boolean;
  account: Account;
  transactionCount: number;
  activeCommitments: readonly AccountCommitmentRef[];
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  errorMessage?: string;
}

export function DeleteConfirmationDialog({
  visible,
  account,
  transactionCount,
  activeCommitments,
  onClose,
  onConfirm,
  isLoading,
  errorMessage,
}: DeleteConfirmationDialogProps) {
  return (
    <ConfirmDialog
      visible={visible}
      busy={isLoading}
      destructive
      title={Strings.accountDetailDeleteTitle(resolveAccountName(account))}
      body={resolveDeleteWarningBody({ transactionCount, activeCommitments })}
      confirmLabel={Strings.accountDetailDeleteConfirm}
      confirmLoadingLabel={Strings.accountDetailDeleting}
      cancelLabel={Strings.accountDetailDeleteKeep}
      onConfirm={onConfirm}
      onCancel={onClose}
      errorMessage={errorMessage}
    />
  );
}
