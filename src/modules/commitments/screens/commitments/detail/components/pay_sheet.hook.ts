import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { AmountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import {
  type CommitmentPaymentAmounts,
  requiresExchangeRate,
  resolveCommitmentPaymentAmounts,
  TransactionAmountError,
} from '@/modules/transactions/domain/transaction_amounts';
import { toLocalDateString } from '@/utils/format_date';
import { MIN_MONEY_AMOUNT } from '@/utils/money';
import { formatStoredMoneyText, parseRequiredMoneyText } from '@/utils/money_text';
import { parseDecimalText, parsePositiveDecimal, parseRateText } from '@/utils/parse_decimal';
import { useZodForm } from '@/utils/use_zod_form.hook';

import type { Commitment } from '../../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../../entities/commitment_payment.entity';
import { commitmentRepository } from '../../../../repositories/commitment.repository';
import { useCommitmentStore } from '../../../../store/commitment.store';
import { usePaySheetState } from './pay_sheet.state';

// Returns `undefined` for inputs that cannot resolve yet, which the resolver would throw on.
function deriveResolution(
  commitment: Commitment | undefined,
  account: Account | undefined,
  amountText: string,
  rateText: string | undefined,
): CommitmentPaymentAmounts | undefined {
  if (!commitment || !account) return undefined;
  // Not a bare `> 0`: `roundMoney(0.004)` is 0, which the resolver throws on.
  const amount = parsePositiveDecimal(amountText);
  const exchangeRate = parseRateText(rateText ?? '');
  if (amount === undefined) return undefined;
  if (requiresExchangeRate(commitment.currency, account.currency) && exchangeRate === undefined) {
    return undefined;
  }
  try {
    return resolveCommitmentPaymentAmounts({
      amount,
      commitmentCurrency: commitment.currency,
      accountCurrency: account.currency,
      exchangeRate,
    });
  } catch (error) {
    if (error instanceof TransactionAmountError) return undefined;
    throw error;
  }
}

/**
 * Only `reason === 'unstorable'` is deterministic and gets its own copy, the shape
 * `resolveTransactionSaveError` uses; everything else keeps the retry banner — a repository
 * `TransactionValidationError` reaching here is a submit-time race where retrying is accurate.
 */
export function resolvePaySheetSaveError(error: unknown): string {
  if (error instanceof TransactionAmountError && error.reason === 'unstorable') {
    return Strings.commitmentsPayErrAmountUnstorable;
  }
  return Strings.commitmentsPayError;
}

// A factory, not a module constant: closing over the cross-currency flag would be a cycle.
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
      // Must match `requiresRate` below on every input, including its `!selectedAccount` guard.
      const acc = accounts.find((a) => a.id === data.account_id);

      // The schema must not accept an account id the write path refuses (archived or deleted).
      if (data.account_id && !acc) {
        ctx.addIssue({
          code: 'custom',
          message: Strings.commitmentsPayErrAccountUnavailable,
          path: ['account_id'],
        });
        return;
      }

      const needsRate =
        !!commitment && !!acc && requiresExchangeRate(commitment.currency, acc.currency);
      if (needsRate) {
        if (!data.exchange_rate) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrRateRequired,
            path: ['exchange_rate'],
          });
        } else if (parseRateText(data.exchange_rate) === undefined) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrRateInvalid,
            path: ['exchange_rate'],
          });
        }
      }

      // The converted amount can round below the money floor even when the entered one clears it.
      const resolved = deriveResolution(commitment, acc, data.amountText, data.exchange_rate);
      if (resolved && resolved.accountNativeAmount < MIN_MONEY_AMOUNT) {
        ctx.addIssue({
          code: 'custom',
          message: Strings.commitmentsPayErrConvertedBelowMin(resolved.accountCurrency),
          path: ['amountText'],
        });
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
  const amountText = form.watch('amountText');
  // Read during render: `formState` is a proxy and only refreshes keys read while rendering.
  const isSubmitted = form.formState.isSubmitted;

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? undefined,
    [accounts, accountId],
  );

  const requiresRate = useMemo(() => {
    // `requiresExchangeRate` is wide, so (USD, undefined) is true there; the guard stays in front.
    if (!commitment || !selectedAccount) return false;
    return requiresExchangeRate(commitment.currency, selectedAccount.currency);
  }, [commitment, selectedAccount]);

  // Every figure here comes from the resolver `markAsPaid` runs, so the preview cannot drift.
  const preview = useMemo(() => {
    const base = {
      convertedTotal: undefined as { amount: number; currency: Currency } | undefined,
      convertedBelowMin: false,
      previewEgpAmount: undefined as number | undefined,
      // Suppression needs a flag: an absent `previewEgpAmount` renders the row placeholder.
      previewHidden: commitment?.currency === Currency.EGP,
      // A rate is still required with nothing to convert: `egp_amount` is the ledger's currency.
      purposeCaption:
        requiresRate && commitment?.currency === selectedAccount?.currency
          ? Strings.commitmentsPayRatePurposeEgp
          : undefined,
    };
    const resolved = deriveResolution(commitment, selectedAccount, amountText, exchangeRateValue);
    if (!commitment || !selectedAccount || !resolved) return base;

    // Below the floor nothing renders; the Amount field carries the reason.
    const convertedBelowMin = resolved.accountNativeAmount < MIN_MONEY_AMOUNT;
    // The gate is currency inequality, not `requiresRate`: USD/USD answers those differently.
    const converts = commitment.currency !== selectedAccount.currency;
    return {
      ...base,
      previewEgpAmount: convertedBelowMin ? undefined : resolved.egpAmount,
      convertedBelowMin,
      convertedTotal:
        converts && !convertedBelowMin
          ? { amount: resolved.accountNativeAmount, currency: resolved.accountCurrency }
          : undefined,
    };
  }, [amountText, commitment, exchangeRateValue, requiresRate, selectedAccount]);

  useEffect(() => {
    if (!visible || !commitment) return;

    let cancelled = false;

    async function prefill() {
      if (!commitment) return;

      const isFixed = commitment.amount_type === AmountType.Fixed;
      const prefillAmount =
        isFixed && payment?.amount_due != null
          ? payment.amount_due
          : isFixed && commitment.amount != null
            ? commitment.amount
            : 0;

      let prefillAccountId = commitment.account_id ?? '';
      if (!prefillAccountId) {
        try {
          const lastPaid = await commitmentRepository.getLastPaidPayment(commitment.id);
          if (!cancelled && lastPaid?.account_id) {
            prefillAccountId = lastPaid.account_id;
          }
        } catch {
          // Prefill is best effort; fall through to the next fallback.
        }
      }
      // A prefilled id can outlive an archived or deleted account and open the sheet invalid.
      if (prefillAccountId && !accounts.some((account) => account.id === prefillAccountId)) {
        prefillAccountId = '';
      }
      if (!prefillAccountId && accounts.length > 0) {
        prefillAccountId = accounts[0].id;
      }

      if (!cancelled) {
        form.reset({
          // `amount_due` can be sub-cent or exponential, so format it to text that re-parses.
          amountText: prefillAmount > 0 ? formatStoredMoneyText(prefillAmount) : '',
          account_id: prefillAccountId,
          paid_date: toLocalDateString(new Date()),
          exchange_rate: requiresExchangeRate(
            commitment.currency,
            accounts.find((account) => account.id === prefillAccountId)?.currency,
          )
            ? formatStoredMoneyText(rate)
            : undefined,
          notes: undefined,
        });
        setRateOverride(false);
        // Module-level state outlives the sheet; a stale save error would greet the next open.
        setSaveError(undefined);
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
    setSaveError(undefined);
    try {
      await markAsPaid(payment.id, {
        amount_paid: parseRequiredMoneyText(data.amountText, 'amountText'),
        account_id: data.account_id,
        paid_date: data.paid_date,
        // Unreachable once the schema passes; removing it costs a non-null assertion.
        exchange_rate_snapshot: requiresRate
          ? (parseRateText(data.exchange_rate ?? '') ?? rate)
          : undefined,
        // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- || is intentional: empty string maps to undefined
        notes: data.notes?.trim() || undefined,
      });
      setVisible(false);
      reset();
      void loadAccounts().catch((error: unknown) =>
        console.error('[paySheet] account revalidation failed:', error),
      );
    } catch (error) {
      // The store logs and rethrows; without this banner the failure is silent.
      setSaveError(resolvePaySheetSaveError(error));
    } finally {
      setSaving(false);
    }
  }

  // RHF calls `onValid` only when validation passes, so a stale banner outlives a failed submit.
  function onInvalid() {
    setSaveError(undefined);
  }

  function selectAccount(account: Account) {
    form.setValue('account_id', account.id);
    // A pick that turns `requiresRate` on seeds the global rate, unless the user typed their own.
    if (
      !rateOverride &&
      commitment &&
      requiresExchangeRate(commitment.currency, account.currency)
    ) {
      // Gate on `isSubmitted`: seeding clears a rate error but must not raise one pre-submit.
      form.setValue('exchange_rate', formatStoredMoneyText(rate), { shouldValidate: isSubmitted });
      setRateOverride(false);
    }
    setAccountPickerVisible(false);
  }

  // The field is hidden when the override is off, so restore the global rate or the save fails.
  function toggleRateOverride() {
    const next = !rateOverride;
    setRateOverride(next);
    if (!next)
      form.setValue('exchange_rate', formatStoredMoneyText(rate), { shouldValidate: isSubmitted });
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
      convertedTotal: preview.convertedTotal,
      convertedBelowMin: preview.convertedBelowMin,
      previewEgpAmount: preview.previewEgpAmount,
      previewHidden: preview.previewHidden,
      purposeCaption: preview.purposeCaption,
    },
    onSubmit: form.handleSubmit(onValid, onInvalid),
    openAccountPicker: () => setAccountPickerVisible(true),
    closeAccountPicker: () => setAccountPickerVisible(false),
    selectAccount,
    setVisible,
    toggleRateOverride,
    setPaidDate: (iso: string) => form.setValue('paid_date', iso, { shouldValidate: true }),
  };
}
