import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { type RecurrencePeriod, RecurrencePreset } from '@/constants/enums';
import { toLocalDateString } from '@/utils/format_date';

import {
  type CommitmentFormSchedule,
  pickRepeatsPreset,
  resolveRepeatsTrack,
} from '../commitment_form.helpers';
import { type CommitmentFormValues, SET_OPTS } from '../commitment_form.shared';
import { INITIAL_PICKER_ENTRY, useCommitmentFormBodyState } from './commitment_form_body.state';

/** The Repeats sheet stages its cadence in the owner's entry; only Done writes it to the form. */
export function useRepeatsSheet(
  owner: string,
  form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue'>,
  schedule: CommitmentFormSchedule,
  settledDueDates: readonly string[],
  now: Date = new Date(),
) {
  const draft = useCommitmentFormBodyState(
    (s) => (s.entries[owner] ?? INITIAL_PICKER_ENTRY).repeatsDraft,
  );

  const actions = useMemo(() => {
    const entryOf = () =>
      useCommitmentFormBodyState.getState().entries[owner] ?? INITIAL_PICKER_ENTRY;
    const { setRepeatsDraft } = useCommitmentFormBodyState.getState();
    return {
      pickPreset: (preset: RecurrencePreset) =>
        setRepeatsDraft(owner, (d) => pickRepeatsPreset(d, preset)),
      setEvery: (every: number) => setRepeatsDraft(owner, (d) => ({ ...d, every })),
      setPeriod: (period: RecurrencePeriod) => setRepeatsDraft(owner, (d) => ({ ...d, period })),
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

  const today = toLocalDateString(now);
  const track = useMemo(
    () =>
      draft === undefined
        ? undefined
        : resolveRepeatsTrack(
            { ...schedule, recurrenceEvery: draft.every, recurrencePeriod: draft.period },
            settledDueDates,
            today,
          ),
    [draft, schedule, settledDueDates, today],
  );

  return {
    state: {
      draft,
      track,
      isCustom: draft?.preset === RecurrencePreset.Custom,
    },
    ...actions,
  };
}
