import { useEffect, useId, useMemo } from 'react';
import { useFormState, type UseFormReturn } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { mergeAccountsById } from '@/modules/accounts/store/account_lookup.helpers';

import type { CommitmentFormValues } from '../commitment_form.shared';
import { INITIAL_PICKER_ENTRY, useCommitmentFormBodyState } from './commitment_form_body.state';

const BODY_FAULT_FIELDS = ['name', 'amount', 'categoryId', 'startDate'] as const;

type BodyFaultField = (typeof BODY_FAULT_FIELDS)[number];

export function useCommitmentFormBodyPickers() {
  const owner = useId();
  const { categoryPickerVisible, showStartDatePicker, showEndDatePicker } =
    useCommitmentFormBodyState(useShallow((s) => s.entries[owner] ?? INITIAL_PICKER_ENTRY));
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
      setShowStartDatePicker: (v: boolean) => state.setShowStartDatePicker(owner, v),
      setShowEndDatePicker: (v: boolean) => state.setShowEndDatePicker(owner, v),
    };
  }, [owner]);

  return {
    state: { categoryPickerVisible, showStartDatePicker, showEndDatePicker },
    ...setters,
  };
}

/** Every account the strip can name: active, archived, and the commitment's own when it was deleted. */
export function useCommitmentFormStripAccounts(
  accountId: string | undefined,
): ReadonlyMap<string, Account> {
  const { accounts, archivedAccounts, accountLookupById } = useAccountStore(
    useShallow((s) => ({
      accounts: s.accounts,
      archivedAccounts: s.archivedAccounts,
      accountLookupById: s.accountLookupById,
    })),
  );

  useEffect(() => {
    // A failure sets the store's `accountLookupError`; the chip reads `Unknown account` meanwhile.
    if (accountId !== undefined) {
      void useAccountStore
        .getState()
        .loadAccountLookup([accountId])
        .catch(() => {});
    }
  }, [accountId]);

  return useMemo(
    () => mergeAccountsById(accounts, archivedAccounts, accountLookupById),
    [accounts, archivedAccounts, accountLookupById],
  );
}

/** The body's own subscription to its faults: a compiled host reuses the body while `form` keeps its identity. */
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
    },
    isSubmitted: formState.isSubmitted,
  };
}

/** The strip's message while the form's account failed to load and the strip cannot name it. */
export function useCommitmentFormStripError(
  accountId: string | undefined,
  accountsById: ReadonlyMap<string, Account>,
): string | undefined {
  const lookupFailed = useAccountStore((s) => s.accountLookupError);
  return lookupFailed && accountId !== undefined && !accountsById.has(accountId)
    ? Strings.transactionsAccountLookupError
    : undefined;
}
