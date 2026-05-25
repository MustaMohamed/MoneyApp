import React from 'react';

import { ConfirmDialog } from '@/components/ui/confirm_dialog';
import { Strings } from '@/constants/strings';

interface Props {
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  visible,
  busy,
  onCancel,
  onConfirm,
}: Props): React.ReactElement {
  return (
    <ConfirmDialog
      visible={visible}
      busy={busy}
      destructive
      title={Strings.deleteConfirmTitle}
      body={Strings.deleteConfirmBody}
      confirmLabel={Strings.deleteTransaction}
      cancelLabel={Strings.deleteCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
