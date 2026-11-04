import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { DurationType } from '@/constants/enums';

import {
  type CommitmentFormSchedule,
  applyEndsDraft,
  resolveEndsSheetPreview,
} from '../commitment_form.helpers';
import { type CommitmentFormValues, ENDS_AFTER_COUNT_MIN } from '../commitment_form.shared';
import { INITIAL_PICKER_ENTRY, useCommitmentFormBodyState } from './commitment_form_body.state';

/** The Ends sheet stages its choice in the owner's entry; only Done writes it to the form. */
export function useEndsSheet(
  owner: string,
  form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue' | 'trigger'>,
  isSubmitted: boolean,
  schedule: CommitmentFormSchedule,
  settledDueDates: readonly string[],
) {
  const draft = useCommitmentFormBodyState(
    (s) => (s.entries[owner] ?? INITIAL_PICKER_ENTRY).endsDraft,
  );

  const actions = useMemo(() => {
    const entryOf = () =>
      useCommitmentFormBodyState.getState().entries[owner] ?? INITIAL_PICKER_ENTRY;
    const { setEndsDraft } = useCommitmentFormBodyState.getState();
    return {
      pickType: (type: DurationType) => setEndsDraft(owner, (d) => ({ ...d, type })),
      setCount: (count: number) =>
        setEndsDraft(owner, (d) => ({ ...d, count: Math.max(count, ENDS_AFTER_COUNT_MIN) })),
      setDate: (date: string) => setEndsDraft(owner, (d) => ({ ...d, date })),
      // A Done that lands after the close, or a second tap, finds the sheet shut and writes nothing.
      done: () => {
        const entry = entryOf();
        if (entry.choiceSheet !== 'ends' || entry.endsDraft === undefined) return;
        applyEndsDraft(form, entry.endsDraft, isSubmitted);
        useCommitmentFormBodyState.getState().closeChoiceSheet(owner);
      },
    };
  }, [owner, form, isSubmitted]);

  const preview = useMemo(() => {
    if (draft === undefined) return { track: undefined, line: undefined };
    const staged: CommitmentFormSchedule = {
      ...schedule,
      durationType: draft.type,
      endAfterCount: draft.count,
      endDate: draft.date,
    };
    return resolveEndsSheetPreview(staged, settledDueDates);
  }, [draft, schedule, settledDueDates]);

  return {
    state: { draft, ...preview },
    ...actions,
  };
}
