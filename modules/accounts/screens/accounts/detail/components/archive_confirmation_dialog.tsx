import { Text } from 'heroui-native';

import { ConfirmDialog } from '@/components/ui/confirm_dialog';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import type { Account } from '../../../../store/account.store';

interface ArchiveConfirmationDialogProps {
  visible: boolean;
  account: Account | undefined;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function ArchiveConfirmationDialog({
  visible,
  account,
  onClose,
  onConfirm,
  isLoading,
}: ArchiveConfirmationDialogProps) {
  const isCC = account?.type === AccountType.CreditCard;

  return (
    <ConfirmDialog
      visible={visible}
      busy={isLoading}
      destructive
      title={Strings.accountDetailArchiveTitle}
      body={Strings.accountDetailArchiveBody}
      confirmLabel={Strings.accountDetailArchiveConfirm}
      cancelLabel={Strings.accountDetailCancel}
      onConfirm={onConfirm}
      onCancel={onClose}
    >
      {isCC ? (
        <Text className="text-accent font-inter mb-2 text-[11px]">
          {Strings.accountDetailArchiveCCWarning}
        </Text>
      ) : null}
    </ConfirmDialog>
  );
}
