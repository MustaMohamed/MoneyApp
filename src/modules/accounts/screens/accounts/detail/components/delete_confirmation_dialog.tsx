import { ConfirmDialog } from '@/components/ui/confirm_dialog';
import { Strings } from '@/constants/strings';
import { resolveAccountName } from '@/utils/account_name';

import type { ArchivedAccountDetailSnapshot } from '../../../../repositories/archived_account_detail.repository';
import type { Account } from '../../../../store/account.store';
import { resolveDeleteWarningBody } from './delete_confirmation.helpers';

interface AccountDeleteConfirmationDialogProps {
  visible: boolean;
  account: Account;
  transactionCount: number;
  activeCommitments: Readonly<ArchivedAccountDetailSnapshot['activeCommitments']>;
  hasReplacementAccount: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  errorMessage?: string;
}

export function AccountDeleteConfirmationDialog({
  visible,
  account,
  transactionCount,
  activeCommitments,
  hasReplacementAccount,
  onClose,
  onConfirm,
  isLoading,
  errorMessage,
}: AccountDeleteConfirmationDialogProps) {
  return (
    <ConfirmDialog
      visible={visible}
      busy={isLoading}
      destructive
      title={Strings.accountDetailDeleteTitle(resolveAccountName(account))}
      body={resolveDeleteWarningBody({
        transactionCount,
        activeCommitments,
        hasReplacementAccount,
      })}
      confirmLabel={Strings.accountDetailDeleteConfirm}
      confirmLoadingLabel={Strings.accountDetailDeleting}
      cancelLabel={Strings.accountDetailDeleteKeep}
      onConfirm={onConfirm}
      onCancel={onClose}
      errorMessage={errorMessage}
    />
  );
}
