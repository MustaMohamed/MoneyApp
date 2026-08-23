import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { AmountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { toLocalDateString } from '@/utils/format_date';
import { parseDecimalText, parsePositiveDecimal } from '@/utils/parse_decimal';
import { useZodForm } from '@/utils/use_zod_form.hook';

import type { Commitment } from '../../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../../entities/commitment_payment.entity';
import { commitmentRepository } from '../../../../repositories/commitment.repository';
import { useCommitmentStore } from '../../../../store/commitment.store';
import { usePaySheetState } from './pay_sheet.state';

// A factory, not a module constant: the rate refine has to know whether this
// payment crosses currencies, and that is derived from the account the form
// holds. Closing over the boolean would be a cycle (schema -> form -> watch ->
// account -> boolean), so the flag is re-derived from `data` at validation
// time. Same shape as the transaction form's `createSchema`.
function createPaySheetSchema(commitment: Commitment | undefined, accounts: Account[]) {
  return z
    .object({
      amountText: z
        .string()
        .min(1, Strings.commitmentsPayErrAmountRequired)
        .refine((s) => parseDecimalText(s) !== undefined, Strings.errAmountInvalid)
        .refine((s) => parsePositiveDecimal(s) !== undefined, Strings.commitmentsPayErrAmountMin),
      account_id: z.string().min(1, Strings.commitmentsPayErrAccountRequired),
      paid_date: z.string().min(1),
      exchange_rate: z.string().optional(),
      notes: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // Must match `requiresRate` below on every input, including its
      // !selectedAccount guard — `onValid` gates the snapshot on that one.
      const acc = accounts.find((a) => a.id === data.account_id);
      const needsRate =
        !!commitment &&
        !!acc &&
        (commitment.currency === Currency.USD || acc.currency === Currency.USD);
      if (needsRate) {
        if (!data.exchange_rate) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrRateRequired,
            path: ['exchange_rate'],
          });
        } else if (parsePositiveDecimal(data.exchange_rate) === undefined) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrRateInvalid,
            path: ['exchange_rate'],
          });
        }
      }
    });
}

type PaySheetFormValues = z.infer<ReturnType<typeof createPaySheetSchema>>;

function buildDefaults(): PaySheetFormValues {
  return {
    amountText: '',
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
  const { visible, saving, accountPickerVisible, rateOverride, saveError } = usePaySheetState(
    useShallow((s) => ({
      visible: s.visible,
      saving: s.saving,
      accountPickerVisible: s.accountPickerVisible,
      rateOverride: s.rateOverride,
      saveError: s.saveError,
    })),
  );
  const setVisible = usePaySheetState.getState().setVisible;
  const setSaving = usePaySheetState.getState().setSaving;
  const setAccountPickerVisible = usePaySheetState.getState().setAccountPickerVisible;
  const setRateOverride = usePaySheetState.getState().setRateOverride;
  const setSaveError = usePaySheetState.getState().setSaveError;
  const reset = usePaySheetState.getState().reset;

  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore.getState().loadAccounts;
  // Currency store gives the timestamp of the last stored exchange-rate
  // update — ExchangeRateRow (V2) reads this to render the "Rate may be
  // stale" warning when the stored rate is older than the staleness
  // window. §7 promoted the V2 ExchangeRateRow to a required-prop API;
  // pay_sheet now plumbs the timestamp through so the warning surfaces
  // here too (commitments was on V1 ExchangeRateRow until §7 cleanup).
  const { rate, rateUpdatedAt } = useCurrencyStore(
    useShallow((state) => ({ rate: state.rate, rateUpdatedAt: state.rate_updated_at })),
  );

  const markAsPaid = useCommitmentStore.getState().markAsPaid;

  const schema = useMemo(() => createPaySheetSchema(commitment, accounts), [commitment, accounts]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildDefaults(),
  });

  const accountId = form.watch('account_id');
  const exchangeRateValue = form.watch('exchange_rate');

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? undefined,
    [accounts, accountId],
  );

  const requiresRate = useMemo(() => {
    if (!commitment || !selectedAccount) return false;
    return commitment.currency === Currency.USD || selectedAccount.currency === Currency.USD;
  }, [commitment, selectedAccount]);

  // Pre-fill form when sheet becomes visible
  useEffect(() => {
    if (!visible || !commitment) return;

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
      if (!prefillAccountId && accounts.length > 0) {
        prefillAccountId = accounts[0].id;
      }

      if (!cancelled) {
        form.reset({
          amountText: prefillAmount > 0 ? String(prefillAmount) : '',
          account_id: prefillAccountId,
          paid_date: toLocalDateString(new Date()),
          exchange_rate:
            commitment.currency === Currency.USD ||
            accounts.find((account) => account.id === prefillAccountId)?.currency === Currency.USD
              ? String(rate)
              : undefined,
          notes: undefined,
        });
        setRateOverride(false);
      }
    }

    void prefill();

    return () => {
      cancelled = true;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- commitment?.id already captures commitment identity changes; form/accountState are stable refs
  }, [visible, commitment?.id, payment?.id]);

  async function onValid(data: PaySheetFormValues) {
    if (!payment) return;
    setSaving(true);
    setSaveError(false);
    try {
      await markAsPaid(payment.id, {
        // Both `??` fallbacks are unreachable once the schema has passed —
        // kept because deleting them costs a cast or a non-null assertion.
        amount_paid: parsePositiveDecimal(data.amountText) ?? Number.NaN,
        account_id: data.account_id,
        paid_date: data.paid_date,
        exchange_rate_snapshot: requiresRate
          ? (parsePositiveDecimal(data.exchange_rate ?? '') ?? rate)
          : undefined,
        // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- || is intentional: empty string maps to undefined
        notes: data.notes?.trim() || undefined,
      });
      setVisible(false);
      reset();
      void loadAccounts().catch((error: unknown) =>
        console.error('[paySheet] account revalidation failed:', error),
      );
    } catch {
      // The store logs and rethrows; the sheet stays open, so the user has to
      // be told why. Without this the failure is silent (review.md class 1).
      setSaveError(true);
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
      saving,
      requiresRate,
      selectedAccount,
      accounts,
      visible,
      accountPickerVisible,
      rateOverride,
      exchangeRateValue,
      rateUpdatedAt,
      saveError,
    },
    onSubmit: form.handleSubmit(onValid),
    openAccountPicker: () => setAccountPickerVisible(true),
    closeAccountPicker: () => setAccountPickerVisible(false),
    selectAccount,
    setVisible,
    toggleRateOverride: () => setRateOverride(!rateOverride),
    setPaidDate: (iso: string) => form.setValue('paid_date', iso, { shouldValidate: true }),
  };
}
