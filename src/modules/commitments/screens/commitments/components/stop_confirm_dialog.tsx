import React from 'react';

import { ConfirmDialog } from '@/components/ui/confirm_dialog';
import { Strings } from '@/constants/strings';

import type { CommitmentStopCounts } from '../../../domain/payment_state';
import { resolveStopConfirmBody } from './stop_confirm_dialog.helpers';

interface Props {
  isOpen: boolean;
  name: string;
  counts: CommitmentStopCounts;
  busy: boolean;
  failed: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function StopConfirmDialog({
  isOpen,
  name,
  counts,
  busy,
  failed,
  onCancel,
  onConfirm,
}: Props): React.ReactElement {
  return (
    <ConfirmDialog
      visible={isOpen}
      busy={busy}
      destructive
      title={Strings.commitmentsStopConfirmTitle(name)}
      body={resolveStopConfirmBody(counts)}
      confirmLabel={Strings.commitmentsStopConfirmConfirm}
      confirmLoadingLabel={Strings.commitmentsStopConfirmBusy}
      cancelLabel={Strings.commitmentsStopConfirmCancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
      errorMessage={failed ? Strings.commitmentsStopError : undefined}
    />
  );
}
