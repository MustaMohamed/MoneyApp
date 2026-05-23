import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { AmountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { commitmentRepository } from '@/repositories/commitment.repository';
import { useAccountStore } from '@/store/account.store';
import { useCommitmentStore } from '@/store/commitment.store';
import { useCurrencyStore } from '@/store/currency.store';
import { toLocalDateString } from '@/utils/format_date';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { usePaySheetState } from './pay_sheet.state';

const schema = z.object({
  amount: z.number({ error: Strings.commitmentsPayErrAmountRequired }).positive(),
  account_id: z.string().min(1, Strings.commitmentsPayErrAccountRequired),
  paid_date: z.string().min(1),
  exchange_rate: z.number().positive().optional(),
  notes: z.string().optional(),
});

type PaySheetFormValues = z.infer<typeof schema>;

function buildDefaults(): PaySheetFormValues {
  return {
    amount: 0,
    account_id: '',
    paid_date: toLocalDateString(new Date()),
    exchange_rate: undefined,
    notes: undefined,
  };
}

export function usePaySheet(
  commitment: Commitment | undefined,
  payment: CommitmentPayment | undefined,
) {
  const {
    state: paySheetState,
    setVisible,
    setSaving,
    setAccountPickerVisible,
    reset,
  } = usePaySheetState(
    useShallow((s) => ({
      state: s.state,
      setVisible: s.setVisible,
      setSaving: s.setSaving,
      setAccountPickerVisible: s.setAccountPickerVisible,
      reset: s.reset,
    })),
  );

  const { state: accountState, loadAccounts } = useAccountStore(
    useShallow((s) => ({ state: s.state, loadAccounts: s.loadAccounts })),
  );
  // Currency store gives the timestamp of the last stored exchange-rate
  // update — ExchangeRateRow (V2) reads this to render the "Rate may be
  // stale" warning when the stored rate is older than the staleness
  // window. §7 promoted the V2 ExchangeRateRow to a required-prop API;
  // pay_sheet now plumbs the timestamp through so the warning surfaces
  // here too (commitments was on V1 ExchangeRateRow until §7 cleanup).
  const { state: currencyState } = useCurrencyStore(useShallow((s) => ({ state: s.state })));

  const {
    markAsPaid,
    loadPaymentsForMonth,
    state: commitmentState,
  } = useCommitmentStore(
    useShallow((s) => ({
      markAsPaid: s.markAsPaid,
      loadPaymentsForMonth: s.loadPaymentsForMonth,
      state: s.state,
    })),
  );

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildDefaults(),
  });

  const accountId = form.watch('account_id');
  const exchangeRateValue = form.watch('exchange_rate');

  const selectedAccount = useMemo(
    () => accountState.accounts.find((a) => a.id === accountId) ?? undefined,
    [accountState.accounts, accountId],
  );

  const requiresRate = useMemo(() => {
    if (!commitment || !selectedAccount) return false;
    return commitment.currency !== selectedAccount.currency;
  }, [commitment, selectedAccount]);

  // Pre-fill form when sheet becomes visible
  useEffect(() => {
    if (!paySheetState.visible || !commitment) return;

    let cancelled = false;

    async function prefill() {
      if (!commitment) return;

      // Amount: pre-fill if fixed, leave 0 if variable
      const isFixed = commitment.amount_type === AmountType.Fixed;
      const prefillAmount =
        isFixed && payment?.amount_due != null
          ? payment.amount_due
          : isFixed && commitment.amount != null
            ? commitment.amount
            : 0;

      // Account: try commitment.account_id first, then last paid, then first in store
      let prefillAccountId = commitment.account_id ?? '';
      if (!prefillAccountId) {
        try {
          const lastPaid = await commitmentRepository.getLastPaidPayment(commitment.id);
          if (!cancelled && lastPaid?.account_id) {
            prefillAccountId = lastPaid.account_id;
          }
        } catch {
          // silently fall through
        }
      }
      if (!prefillAccountId && accountState.accounts.length > 0) {
        prefillAccountId = accountState.accounts[0].id;
      }

      if (!cancelled) {
        form.reset({
          amount: prefillAmount,
          account_id: prefillAccountId,
          paid_date: toLocalDateString(new Date()),
          exchange_rate: undefined,
          notes: undefined,
        });
      }
    }

    void prefill();

    return () => {
      cancelled = true;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- commitment?.id already captures commitment identity changes; form/accountState are stable refs
  }, [paySheetState.visible, commitment?.id, payment?.id]);

  async function onValid(data: PaySheetFormValues) {
    if (!payment) return;
    setSaving(true);
    try {
      await markAsPaid(payment.id, {
        amount_paid: data.amount,
        account_id: data.account_id,
        paid_date: data.paid_date,
        exchange_rate_snapshot: data.exchange_rate,
        // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- || is intentional: empty string maps to undefined
        notes: data.notes?.trim() || undefined,
      });
      await loadAccounts();
      await loadPaymentsForMonth(commitmentState.selectedMonth);
      setVisible(false);
      reset();
    } catch {
      // error logged by store
    } finally {
      setSaving(false);
    }
  }

  function selectAccount(account: Account) {
    form.setValue('account_id', account.id);
    setAccountPickerVisible(false);
  }

  return {
    form,
    state: {
      saving: paySheetState.saving,
      requiresRate,
      selectedAccount,
      accounts: accountState.accounts,
      visible: paySheetState.visible,
      accountPickerVisible: paySheetState.accountPickerVisible,
      exchangeRateValue,
      rateUpdatedAt: currencyState.rate_updated_at,
    },
    onSubmit: form.handleSubmit(onValid),
    openAccountPicker: () => setAccountPickerVisible(true),
    closeAccountPicker: () => setAccountPickerVisible(false),
    selectAccount,
    setVisible,
  };
}
