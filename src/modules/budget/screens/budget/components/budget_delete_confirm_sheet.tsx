import React from 'react';

import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  /** Category name — interpolated into the body copy. */
  categoryName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Destructive ConfirmSheet for budget removal via the swipe-delete action.
 * Replaces the inline "Remove budget" link in set_budget_sheet.tsx
 * (which had no confirmation step).
 */
export function BudgetDeleteConfirmSheet({
  isOpen,
  categoryName,
  busy,
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
