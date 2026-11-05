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

export function SkipConfirmDialog({
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
      title={Strings.commitmentsSkipConfirmTitle}
      body={body}
      confirmLabel={Strings.commitmentsSkipConfirmConfirm}
      confirmLoadingLabel={Strings.commitmentsSkipConfirmBusy}
      cancelLabel={Strings.commitmentsSkipConfirmCancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
      errorMessage={errorMessage}
    />
  );
}
