import { useEffect, useRef } from 'react';
import type { FieldValues, Path, PathValue, UseFormReturn } from 'react-hook-form';

import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

/** The rate's still-typing hold for both transaction hooks; returns the hold-or-set step. */
export function useTransactionFormRate<T extends FieldValues, N extends Path<T>>(
  form: Pick<UseFormReturn<T>, 'getValues' | 'setValue' | 'clearErrors'>,
  name: N,
  rate: PathValue<T, N>,
  revalidateAfterSubmit: () => void,
): (text: PathValue<T, N> & string) => void {
  // Only the returned setter writes this ref, so a held text survives a run an earlier edit queued.
  const heldRateRef = useRef<string | undefined>(undefined);
  // A rate edit re-validates too, unless the form's rate now is the still-typing text held.
  useEffect(() => {
    const current: unknown = form.getValues(name);
    if (heldRateRef.current === current) return;
    revalidateAfterSubmit();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- a rate change alone runs it; the form's rate and the caller's re-validation are read when it runs
  }, [rate]);

  return (text) => {
    const current: unknown = form.getValues(name);
    if (text === current) return;
    // `text` twice: the hold's last parameter stays unresolved while `T` is generic.
    const held = holdStillTypingDecimal(form, name, text, true, text);
    heldRateRef.current = held ? text : undefined;
    if (!held) form.setValue(name, text);
  };
}
