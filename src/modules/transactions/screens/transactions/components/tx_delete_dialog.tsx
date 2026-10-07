import React from 'react';

import { ConfirmDialog } from '@/components/ui/confirm_dialog';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  body: string;
  busy: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TxDeleteDialog({
  isOpen,
  body,
  busy,
  errorMessage,
  onCancel,
  onConfirm,
}: Props): React.ReactElement {
  return (
    <ConfirmDialog
      visible={isOpen}
      busy={busy}
      destructive
      title={Strings.deleteConfirmTitle}
      body={body}
      confirmLabel={Strings.deleteTransaction}
      confirmLoadingLabel={Strings.deleteConfirmDeleting}
      cancelLabel={Strings.deleteCancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
      errorMessage={errorMessage}
    />
  );
}
