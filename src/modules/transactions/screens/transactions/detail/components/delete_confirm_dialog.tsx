import React from 'react';

import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  busy: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Destructive ConfirmSheet for transaction deletion — used by both the
 * transaction detail screen (existing) and the swipe-list action (new).
 * Migrated from ConfirmDialog to ConfirmSheet per the swipe-actions spec §6.1.
 */
export function DeleteConfirmDialog({
  isOpen,
  busy,
  errorMessage,
  onCancel,
  onConfirm,
}: Props): React.ReactElement {
  return (
    <ConfirmSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      busy={busy}
      errorMessage={errorMessage}
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
