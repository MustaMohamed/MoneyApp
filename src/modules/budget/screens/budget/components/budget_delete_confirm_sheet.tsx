import React from 'react';

import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  categoryName: string;
  busy: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function BudgetDeleteConfirmSheet({
  isOpen,
  categoryName,
  busy,
  errorMessage,
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
      errorMessage={errorMessage}
      destructive
      title={Strings.budgetDeleteConfirmTitle}
      body={Strings.budgetDeleteConfirmBody(categoryName)}
      confirmLabel={Strings.budgetDeleteConfirmConfirm}
      cancelLabel={Strings.budgetDeleteConfirmCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
