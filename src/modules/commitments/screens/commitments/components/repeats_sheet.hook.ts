import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { type RecurrencePeriod, RecurrencePreset } from '@/constants/enums';

import { pickRepeatsPreset, resolveRepeatsRowValue } from '../commitment_form.helpers';
import { type CommitmentFormValues, type RepeatsDraft, SET_OPTS } from '../commitment_form.shared';
import { INITIAL_PICKER_ENTRY, useCommitmentFormBodyState } from './commitment_form_body.state';

/** The Repeats sheet stages its cadence in the owner's entry; only Done writes it to the form. */
export function useRepeatsSheet(
  owner: string,
  form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue'>,
) {
  const draft = useCommitmentFormBodyState(
    (s) => (s.entries[owner] ?? INITIAL_PICKER_ENTRY).repeatsDraft,
  );

  const actions = useMemo(() => {
    const entryOf = () =>
      useCommitmentFormBodyState.getState().entries[owner] ?? INITIAL_PICKER_ENTRY;
    const stage = (next: (current: RepeatsDraft) => RepeatsDraft) => {
      const current = entryOf().repeatsDraft;
      if (current !== undefined) {
        useCommitmentFormBodyState.getState().setRepeatsDraft(owner, next(current));
      }
    };
    return {
      pickPreset: (preset: RecurrencePreset) => stage((d) => pickRepeatsPreset(d, preset)),
      setEvery: (every: number) => stage((d) => ({ ...d, every })),
      setPeriod: (period: RecurrencePeriod) => stage((d) => ({ ...d, period })),
      // A Done that lands after the close, or a second tap, finds the sheet shut and writes nothing.
      done: () => {
        const entry = entryOf();
        if (entry.choiceSheet !== 'repeats' || entry.repeatsDraft === undefined) return;
        form.setValue('recurrenceEvery', entry.repeatsDraft.every, SET_OPTS);
        form.setValue('recurrencePeriod', entry.repeatsDraft.period, SET_OPTS);
        useCommitmentFormBodyState.getState().closeChoiceSheet(owner);
      },
    };
  }, [owner, form]);

  return {
    state: {
      draft,
      label: draft === undefined ? undefined : resolveRepeatsRowValue(draft.every, draft.period),
      isCustom: draft?.preset === RecurrencePreset.Custom,
    },
    ...actions,
  };
}
