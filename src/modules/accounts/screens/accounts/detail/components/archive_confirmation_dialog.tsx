import { Typography } from 'heroui-native';

import { ConfirmDialog } from '@/components/ui/confirm_dialog';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';

import type { Account } from '../../../../store/account.store';
import { resolveArchiveCcLine } from './archive_confirmation.helpers';

interface ArchiveConfirmationDialogProps {
  visible: boolean;
  account: Account;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  errorMessage?: string;
}

export function ArchiveConfirmationDialog({
  visible,
  account,
  onClose,
  onConfirm,
  isLoading,
  errorMessage,
}: ArchiveConfirmationDialogProps) {
  const ccLine = resolveArchiveCcLine(account);

  return (
    <ConfirmDialog
      visible={visible}
      busy={isLoading}
      destructive
      title={Strings.accountDetailArchiveTitle(account.name)}
      body={Strings.accountDetailArchiveBody}
      confirmLabel={Strings.accountDetailArchiveConfirm}
      cancelLabel={Strings.accountDetailCancel}
      onConfirm={onConfirm}
      onCancel={onClose}
      errorMessage={errorMessage}
    >
      {ccLine === undefined ? null : (
        <Typography
          className="text-warning font-inter mb-2"
          style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
        >
          {ccLine}
        </Typography>
      )}
    </ConfirmDialog>
  );
}
