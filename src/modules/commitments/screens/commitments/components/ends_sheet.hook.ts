import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { DurationType } from '@/constants/enums';

import { applyEndsDraft, resolveEndsRowValue } from '../commitment_form.helpers';
import {
  type CommitmentFormValues,
  ENDS_AFTER_COUNT_MIN,
  type EndsDraft,
} from '../commitment_form.shared';
import { INITIAL_PICKER_ENTRY, useCommitmentFormBodyState } from './commitment_form_body.state';

/** The Ends sheet stages its choice in the owner's entry; only Done writes it to the form. */
export function useEndsSheet(
  owner: string,
  form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue' | 'trigger'>,
  isSubmitted: boolean,
) {
  const draft = useCommitmentFormBodyState(
    (s) => (s.entries[owner] ?? INITIAL_PICKER_ENTRY).endsDraft,
  );

  const actions = useMemo(() => {
    const entryOf = () =>
      useCommitmentFormBodyState.getState().entries[owner] ?? INITIAL_PICKER_ENTRY;
    const stage = (next: (current: EndsDraft) => EndsDraft) => {
      const current = entryOf().endsDraft;
      if (current !== undefined) {
        useCommitmentFormBodyState.getState().setEndsDraft(owner, next(current));
      }
    };
    return {
      pickType: (type: DurationType) => stage((d) => ({ ...d, type })),
      setCount: (count: number) =>
        stage((d) => ({ ...d, count: Math.max(count, ENDS_AFTER_COUNT_MIN) })),
      setDate: (date: string) => stage((d) => ({ ...d, date })),
      // A Done that lands after the close, or a second tap, finds the sheet shut and writes nothing.
      done: () => {
        const entry = entryOf();
        if (entry.choiceSheet !== 'ends' || entry.endsDraft === undefined) return;
        applyEndsDraft(form, entry.endsDraft, isSubmitted);
        useCommitmentFormBodyState.getState().closeChoiceSheet(owner);
      },
    };
  }, [owner, form, isSubmitted]);

  return {
    state: {
      draft,
      track:
        draft === undefined ? undefined : resolveEndsRowValue(draft.type, draft.count, draft.date),
    },
    ...actions,
  };
}
