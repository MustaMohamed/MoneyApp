import { useEffect } from 'react';
import { useController, type UseFormReturn } from 'react-hook-form';

import { formatStoredMoneyText } from '@/utils/money_text';

import { applyCommitmentAmountText, resolveAmountHeroSyncText } from '../commitment_form.helpers';
import type { CommitmentFormValues } from '../commitment_form.shared';
import { useCommitmentAmountHeroStore } from './commitment_amount_hero.store';

/** Reads the amount through its own controller, so a keystroke re-renders the hero and not the body. */
export function useCommitmentAmountHero(form: UseFormReturn<CommitmentFormValues>): {
  text: string;
  onChange: (masked: string) => void;
} {
  const { field } = useController({ control: form.control, name: 'amount' });
  const { state, setText, syncToValue } = useCommitmentAmountHeroStore(
    formatStoredMoneyText(field.value),
  );

  useEffect(() => {
    const next = resolveAmountHeroSyncText(state.text, field.value);
    if (next !== undefined) syncToValue(next);
  }, [field.value]); // oxlint-disable-line react-hooks/exhaustive-deps -- omit syncToValue/state.text to prevent sync loop

  return {
    text: state.text,
    onChange: (masked) => {
      setText(masked);
      applyCommitmentAmountText(form, masked, field.onChange);
    },
  };
}
