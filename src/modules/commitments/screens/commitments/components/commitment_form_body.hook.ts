import { useEffect, useId, useMemo } from 'react';
import { useFormState, useWatch, type UseFormReturn } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';

import type { RecurrencePeriod } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import {
  type AccountsByIdRead,
  lookupLeavesUnresolved,
} from '@/modules/accounts/store/account_lookup.helpers';
import { useAccountsById } from '@/modules/accounts/store/use_accounts_by_id.hook';
import { toLocalDateString } from '@/utils/format_date';

import {
  resolveCommitmentFirstPaymentFootnote,
  resolveCommitmentFormStatus,
  seedEndsDraft,
  seedRepeatsDraft,
} from '../commitment_form.helpers';
import type { CommitmentFormValues } from '../commitment_form.shared';
import { INITIAL_PICKER_ENTRY, useCommitmentFormBodyState } from './commitment_form_body.state';

const BODY_FAULT_FIELDS = [
  'name',
  'amount',
  'categoryId',
  'startDate',
  'recurrenceEvery',
  'endAfterCount',
  'endDate',
] as const;

export type BodyFaultField = (typeof BODY_FAULT_FIELDS)[number];

export function useCommitmentFormBodyPickers() {
  const owner = useId();
  // Picks the three flags alone, so a Repeats draft step does not re-render the body.
  const { categoryPickerVisible, showEndDatePicker, choiceSheet } = useCommitmentFormBodyState(
    useShallow((s) => {
      const entry = s.entries[owner] ?? INITIAL_PICKER_ENTRY;
      return {
        categoryPickerVisible: entry.categoryPickerVisible,
        showEndDatePicker: entry.showEndDatePicker,
        choiceSheet: entry.choiceSheet,
      };
    }),
  );
  const claim = useCommitmentFormBodyState.getState().claim;
  const release = useCommitmentFormBodyState.getState().release;

  useEffect(() => {
    claim(owner);
    return () => release(owner);
  }, [owner, claim, release]);

  const setters = useMemo(() => {
    const state = useCommitmentFormBodyState.getState();
    return {
      setCategoryPickerVisible: (v: boolean) => state.setCategoryPickerVisible(owner, v),
      setShowEndDatePicker: (v: boolean) => state.setShowEndDatePicker(owner, v),
      closeChoiceSheet: () => state.closeChoiceSheet(owner),
      // A row tap re-seeds its draft from the form, since a close without Done keeps the last one.
      openRepeatsSheet: (every: number, period: RecurrencePeriod) =>
        state.openRepeatsSheet(owner, seedRepeatsDraft(every, period)),
      openEndsSheet: (
        values: Pick<
          CommitmentFormValues,
          'durationType' | 'endAfterCount' | 'endDate' | 'startDate'
        >,
      ) => state.openEndsSheet(owner, seedEndsDraft(values)),
    };
  }, [owner]);

  return {
    owner,
    state: { categoryPickerVisible, showEndDatePicker, choiceSheet },
    ...setters,
  };
}

/** Every account the strip can name: active, archived, and the commitment's own when it was deleted. */
export function useCommitmentFormStripAccounts(accountId: string | undefined): AccountsByIdRead {
  const accountRead = useAccountsById();

  useEffect(() => {
    // A failure sets the store's `accountLookupError`; the chip reads `Unknown account` meanwhile.
    if (accountId !== undefined) {
      void useAccountStore
        .getState()
        .loadAccountLookup([accountId])
        .catch(() => {});
    }
  }, [accountId]);

  return accountRead;
}

/** Each reader subscribes for itself: a compiled host reuses the body while `form` keeps its identity. */
export function useCommitmentFormBodyFaults(form: UseFormReturn<CommitmentFormValues>): {
  faults: Record<BodyFaultField, string | undefined>;
  isSubmitted: boolean;
} {
  const formState = useFormState({ control: form.control, name: BODY_FAULT_FIELDS });
  const faultOf = (field: BodyFaultField) => form.getFieldState(field, formState).error?.message;
  return {
    faults: {
      name: faultOf('name'),
      amount: faultOf('amount'),
      categoryId: faultOf('categoryId'),
      startDate: faultOf('startDate'),
      recurrenceEvery: faultOf('recurrenceEvery'),
      endAfterCount: faultOf('endAfterCount'),
      endDate: faultOf('endDate'),
    },
    isSubmitted: formState.isSubmitted,
  };
}

/** The strip's message while the form's account failed to load and the strip cannot name it. */
export function resolveCommitmentFormStripError(
  accountRead: AccountsByIdRead,
  accountId: string | undefined,
): string | undefined {
  return lookupLeavesUnresolved(accountRead, accountId === undefined ? [] : [accountId])
    ? Strings.transactionsAccountLookupError
    : undefined;
}

export function useCommitmentFormStatus(
  form: UseFormReturn<CommitmentFormValues>,
  saveError: string | undefined,
): string | undefined {
  return resolveCommitmentFormStatus(useCommitmentFormBodyFaults(form).faults, saveError);
}

export function useCommitmentFirstPaymentFootnote(
  form: UseFormReturn<CommitmentFormValues>,
  now: Date = new Date(),
): string | undefined {
  const [startDate, recurrenceEvery, recurrencePeriod, durationType, endAfterCount, endDate] =
    useWatch({
      control: form.control,
      name: [
        'startDate',
        'recurrenceEvery',
        'recurrencePeriod',
        'durationType',
        'endAfterCount',
        'endDate',
      ],
    });
  return resolveCommitmentFirstPaymentFootnote(
    { startDate, recurrenceEvery, recurrencePeriod, durationType, endAfterCount, endDate },
    toLocalDateString(now),
  );
}
