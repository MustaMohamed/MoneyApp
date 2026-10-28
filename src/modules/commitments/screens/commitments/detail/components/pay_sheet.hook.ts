import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { AmountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import {
  resolveAccountStripChips,
  resolveStripSelectedId,
} from '@/modules/transactions/components/transaction_row.helpers';
import {
  type CommitmentPaymentAmounts,
  requiresExchangeRate,
  resolveCommitmentPaymentAmounts,
  TransactionAmountError,
} from '@/modules/transactions/domain/transaction_amounts';
import { resolveAccountName } from '@/utils/account_name';
import { MIN_MONEY_AMOUNT } from '@/utils/money';
import { formatStoredMoneyText, parseRequiredMoneyText } from '@/utils/money_text';
import { parseDecimalText, parsePositiveDecimal, parseRateText } from '@/utils/parse_decimal';
import { setTypedDecimal, useZodForm } from '@/utils/use_zod_form.hook';

import type { Commitment } from '../../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../../entities/commitment_payment.entity';
import { useCommitmentStore } from '../../../../store/commitment.store';
import { resolveDisplayAmount } from '../../../../utils/commitment_status';
import {
  type PaySheetFieldErrors,
  type PayWritePreview,
  resolvePayButtonLabel,
  resolvePaySheetStatusMessage,
  resolvePayTrackFootnote,
} from './pay_sheet.helpers';
import { INITIAL_PAY_SHEET_ENTRY, usePaySheetState } from './pay_sheet.state';

/**
 * `resolved` is `undefined` for inputs that cannot resolve yet (the resolver would throw on
 * them for a reason other than the destination leg). `zeroDestination` is `true` specifically
 * for the resolver's #363 refusal — the caller already knows the destination currency from its
 * own `account` argument, so it never needs a fabricated `CommitmentPaymentAmounts` to render
 * "converts below the floor": both call sites only read `accountNativeAmount`/`accountCurrency`
 * off `resolved` once that flag is set, and this flag is what stands in for them instead.
 */
function deriveResolution(
  commitment: Commitment | undefined,
  account: Account | undefined,
  amountText: string,
  rateText: string | undefined,
): { resolved: CommitmentPaymentAmounts | undefined; zeroDestination: boolean } {
  if (!commitment || !account) return { resolved: undefined, zeroDestination: false };
  // Not a bare `> 0`: `roundMoney(0.004)` is 0, which the resolver throws on.
  const amount = parsePositiveDecimal(amountText);
  const exchangeRate = parseRateText(rateText ?? '');
  if (amount === undefined) return { resolved: undefined, zeroDestination: false };
  if (requiresExchangeRate(commitment.currency, account.currency) && exchangeRate === undefined) {
    return { resolved: undefined, zeroDestination: false };
  }
  try {
    const resolved = resolveCommitmentPaymentAmounts({
      amount,
      commitmentCurrency: commitment.currency,
      accountCurrency: account.currency,
      exchangeRate,
    });
    return { resolved, zeroDestination: false };
  } catch (error) {
    if (error instanceof TransactionAmountError) {
      return { resolved: undefined, zeroDestination: error.reason === 'zero-destination' };
    }
    throw error;
  }
}

/**
 * `'unstorable'` and `'zero-destination'` are deterministic and get their own copy, the shape
 * `resolveTransactionSaveError` uses; everything else keeps the retry banner — a repository
 * `TransactionValidationError` reaching here is a submit-time race where retrying is accurate.
 * `deriveResolution`'s `zeroDestination` flag already blocks `'zero-destination'` at the field
 * pre-submit (mirroring `resolveDestinationFloorError`), so this branch is the same fallback
 * `resolveTransactionSaveError`'s is: whatever still reaches save after state changed underneath
 * a validated form.
 */
export function resolvePaySheetSaveError(error: unknown): string {
  if (error instanceof TransactionAmountError) {
    if (error.reason === 'unstorable') return Strings.commitmentsPayErrAmountUnstorable;
    if (error.reason === 'zero-destination') return Strings.commitmentsPayErrDestinationTooSmall;
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
      const { resolved, zeroDestination } = deriveResolution(
        commitment,
        acc,
        data.amountText,
        data.exchange_rate,
      );
      const convertedBelowMin = resolved
        ? resolved.accountNativeAmount < MIN_MONEY_AMOUNT
        : zeroDestination;
      if (acc && convertedBelowMin) {
        ctx.addIssue({
          code: 'custom',
          message: Strings.commitmentsPayErrConvertedBelowMin(acc.currency),
          path: ['amountText'],
        });
      }
    });
}

type PaySheetFormValues = z.infer<ReturnType<typeof createPaySheetSchema>>;

function buildDefaults(today: string | undefined): PaySheetFormValues {
  return {
    amountText: '',
    account_id: '',
    paid_date: today ?? '',
    exchange_rate: undefined,
    notes: undefined,
  };
}

export function usePaySheet(
  owner: string,
  commitment: Commitment | undefined,
  payment: CommitmentPayment | undefined,
  today: string | undefined,
) {
  const { visible, saving, rateOverride, saveError } = usePaySheetState(
    useShallow((s) => s.entries[owner] ?? INITIAL_PAY_SHEET_ENTRY),
  );
  const setVisible = usePaySheetState.getState().setVisible;
  const setSaving = usePaySheetState.getState().setSaving;
  const setRateOverride = usePaySheetState.getState().setRateOverride;
  const setSaveError = usePaySheetState.getState().setSaveError;
  const resetEntry = usePaySheetState.getState().resetEntry;

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
    defaultValues: buildDefaults(today),
  });

  const accountId = form.watch('account_id');
  const exchangeRateValue = form.watch('exchange_rate');
  const amountText = form.watch('amountText');
  const paidDate = form.watch('paid_date');
  const notes = form.watch('notes');
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
      writePreview: undefined as PayWritePreview | undefined,
      previewEgpAmount: undefined as number | undefined,
      // Suppression needs a flag: an absent `previewEgpAmount` renders the row placeholder.
      previewHidden: commitment?.currency === Currency.EGP,
      // A rate is still required with nothing to convert: `egp_amount` is the ledger's currency.
      purposeCaption:
        requiresRate && commitment?.currency === selectedAccount?.currency
          ? Strings.commitmentsPayRatePurposeEgp
          : undefined,
    };
    const { resolved, zeroDestination } = deriveResolution(
      commitment,
      selectedAccount,
      amountText,
      exchangeRateValue,
    );
    if (!commitment || !selectedAccount || (!resolved && !zeroDestination)) return base;

    // Below the floor nothing renders; the Amount field carries the reason.
    const convertedBelowMin = resolved ? resolved.accountNativeAmount < MIN_MONEY_AMOUNT : true;
    // The gate is currency inequality, not `requiresRate`: USD/USD answers those differently.
    const converts = commitment.currency !== selectedAccount.currency;
    const writePreview: PayWritePreview | undefined =
      !convertedBelowMin && resolved
        ? {
            amount: resolved.accountNativeAmount,
            currency: resolved.accountCurrency,
            accountName: resolveAccountName(selectedAccount),
          }
        : undefined;
    return {
      ...base,
      previewEgpAmount: convertedBelowMin ? undefined : resolved?.egpAmount,
      convertedBelowMin,
      writePreview,
      convertedTotal:
        converts && writePreview
          ? { amount: writePreview.amount, currency: writePreview.currency }
          : undefined,
    };
  }, [amountText, commitment, exchangeRateValue, requiresRate, selectedAccount]);

  useEffect(() => {
    if (!visible || !commitment || today === undefined) return;

    const isFixed = commitment.amount_type === AmountType.Fixed;
    const prefillAmount =
      isFixed && payment?.amount_due != null
        ? payment.amount_due
        : isFixed && commitment.amount != null
          ? commitment.amount
          : 0;
    const prefillAccountId =
      commitment.account_id === null
        ? ''
        : (resolveStripSelectedId(accounts, commitment.account_id) ?? '');

    form.reset({
      // `amount_due` can be sub-cent or exponential, so format it to text that re-parses.
      amountText: prefillAmount > 0 ? formatStoredMoneyText(prefillAmount) : '',
      account_id: prefillAccountId,
      paid_date: today,
      exchange_rate: requiresExchangeRate(
        commitment.currency,
        accounts.find((account) => account.id === prefillAccountId)?.currency,
      )
        ? formatStoredMoneyText(rate)
        : undefined,
      notes: undefined,
    });
    setRateOverride(owner, false);
    // Module-level state outlives the sheet; a stale save error would greet the next open.
    setSaveError(owner, undefined);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- commitment?.id already captures commitment identity changes; form/accountState are stable refs
  }, [visible, commitment?.id, payment?.id, today]);

  async function onValid(data: PaySheetFormValues) {
    if (!payment) return;
    setSaving(owner, true);
    setSaveError(owner, undefined);
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
      setVisible(owner, false);
      resetEntry(owner);
      void loadAccounts().catch((error: unknown) =>
        console.error('[paySheet] account revalidation failed:', error),
      );
    } catch (error) {
      // The store logs and rethrows; without this banner the failure is silent.
      setSaveError(owner, resolvePaySheetSaveError(error));
    } finally {
      setSaving(owner, false);
    }
  }

  // RHF calls `onValid` only when validation passes, so a stale banner outlives a failed submit.
  function onInvalid() {
    setSaveError(owner, undefined);
  }

  function selectAccount(accountId: string) {
    form.setValue('account_id', accountId);
    const account = accounts.find((a) => a.id === accountId);
    // A pick that turns `requiresRate` on seeds the global rate, unless the user typed their own.
    if (
      !rateOverride &&
      commitment &&
      account &&
      requiresExchangeRate(commitment.currency, account.currency)
    ) {
      // Gate on `isSubmitted`: seeding clears a rate error but must not raise one pre-submit.
      form.setValue('exchange_rate', formatStoredMoneyText(rate), { shouldValidate: isSubmitted });
      setRateOverride(owner, false);
    }
    // After a press, every field re-validates against the account just picked, so a stale fault cannot stay counted.
    if (isSubmitted) void form.trigger();
  }

  // The field is hidden when the override is off, so restore the global rate or the save fails.
  function toggleRateOverride() {
    const next = !rateOverride;
    setRateOverride(owner, next);
    if (!next)
      form.setValue('exchange_rate', formatStoredMoneyText(rate), { shouldValidate: isSubmitted });
  }

  // The hero has already masked the text.
  function setAmountText(text: string) {
    setTypedDecimal(form, 'amountText', text, true, isSubmitted);
  }

  // Pinned false keeps a stale error; pinned true validates before any submit.
  function setExchangeRate(text: string) {
    setTypedDecimal(form, 'exchange_rate', text, true, isSubmitted);
  }

  const fieldErrors = form.formState.errors;
  const pressErrors: PaySheetFieldErrors = {
    amount: fieldErrors.amountText?.message,
    account: fieldErrors.account_id?.message,
    rate: fieldErrors.exchange_rate?.message,
  };
  // The RHF error wins the amount's slot; the live flag is the only source of it before a press.
  const errors: PaySheetFieldErrors = {
    ...pressErrors,
    amount:
      pressErrors.amount ??
      (preview.convertedBelowMin && selectedAccount
        ? Strings.commitmentsPayErrConvertedBelowMin(selectedAccount.currency)
        : undefined),
  };
  const stripChips = useMemo(
    () => resolveAccountStripChips(accounts, accountId),
    [accounts, accountId],
  );
  const trackFootnote =
    commitment === undefined || today === undefined
      ? undefined
      : resolvePayTrackFootnote({
          amountType: commitment.amount_type,
          amountText,
          estimate:
            commitment.amount_type === AmountType.Variable
              ? resolveDisplayAmount(payment, commitment).amount
              : undefined,
          commitmentCurrency: commitment.currency,
          preview: preview.writePreview,
          paidDate,
          today,
        });

  return {
    form,
    state: {
      saving,
      requiresRate,
      visible,
      rateOverride,
      exchangeRateValue,
      rateUpdatedAt,
      saveError,
      convertedTotal: preview.convertedTotal,
      previewEgpAmount: preview.previewEgpAmount,
      previewHidden: preview.previewHidden,
      purposeCaption: preview.purposeCaption,
      amountText,
      paidDate,
      note: notes ?? '',
      stripChips,
      errors,
      trackFootnote,
      // A fault counts only once a press marked it, so the live converted line counts nothing.
      statusMessage: resolvePaySheetStatusMessage(pressErrors),
      ctaLabel: commitment
        ? resolvePayButtonLabel(amountText, commitment.currency)
        : Strings.commitmentsPayCtaBare,
    },
    onSubmit: form.handleSubmit(onValid, onInvalid),
    selectAccount,
    setVisible: (v: boolean) => setVisible(owner, v),
    toggleRateOverride,
    setAmountText,
    setExchangeRate,
    setPaidDate: (iso: string) => form.setValue('paid_date', iso, { shouldValidate: true }),
    setNote: (text: string) => form.setValue('notes', text),
  };
}
