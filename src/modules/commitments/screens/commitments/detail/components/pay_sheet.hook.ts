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

/**
 * Parse, gate, resolve — the sequence the schema's sub-floor refine and the
 * sheet's preview both need, in one place so they cannot answer differently
 * for the same form. `undefined` means the inputs cannot produce a resolution
 * yet, which is also exactly the set of inputs the resolver throws on.
 *
 * Ownership of the operands stays with the caller (the P5 layering ruling):
 * the schema passes its own `data` fields, the preview passes what it watches.
 * Only the shared logic lives here.
 *
 * The resolver's output guard (ADR: parse-floor-money-only — a typed amount
 * too large to store) is caught here too, alongside the input-side
 * conditions above — never a render crash, and this is the one place that
 * would otherwise duplicate the resolver's own math to detect it upfront.
 */
function deriveResolution(
  commitment: Commitment | undefined,
  account: Account | undefined,
  amountText: string,
  rateText: string | undefined,
): CommitmentPaymentAmounts | undefined {
  if (!commitment || !account) return undefined;
  // `parsePositiveDecimal`, not a bare `> 0`: 0.004 is positive, and
  // `roundMoney(0.004)` is 0, which the resolver throws on.
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

      // W1B: an id the loaded (non-archived) list does not hold is one the
      // write path refuses (commitment.repository.ts:211-214). Falling through
      // on `acc === undefined` read as "no rate needed": the schema passed,
      // `markAsPaid` threw, and the user got only the generic save banner with
      // no field to fix. Deliberately NOT resolved through
      // getAccountByIdIncludingArchived — the schema must not accept what the
      // write rejects. The empty selection stays the field's own `min(1)`.
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

      // W1B: the converted amount can round below the money floor even though
      // the entered amount clears it (0.01 EGP at 49.06 is 0.00 USD). The write
      // path refuses that at validateTransactionPolicy's amount_invalid, with
      // the generic banner; this puts the reason on the Amount field and blocks
      // the submit. It lives in the schema and not in a hook-level `setError`
      // because RHF calls the latter only once validation has already passed.
      // Operands come from `data` rather than from anything closed over: the
      // schema is memoized on `[commitment, accounts]`, so a form value it had
      // captured could be a render behind the one being validated.
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
  const amountText = form.watch('amountText');
  // Read DURING render, not inside the handler that uses it. `formState` is a
  // proxy: RHF only re-renders — and only refreshes `form.formState` — for the
  // keys something read while rendering. Read from inside `selectAccount`
  // instead and the flag is whatever the last render saw, which after a failed
  // submit is still `false`. Verified: MA-008 T6 records the same trap for
  // `formState.errors`.
  const isSubmitted = form.formState.isSubmitted;

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? undefined,
    [accounts, accountId],
  );

  const requiresRate = useMemo(() => {
    // The guard is load-bearing and stays in front of the predicate rather
    // than inside it: `requiresExchangeRate` is wide, so (USD, undefined)
    // is true there. A rate must not be demanded before an account exists to
    // demand it for (mockup frame 4).
    if (!commitment || !selectedAccount) return false;
    return requiresExchangeRate(commitment.currency, selectedAccount.currency);
  }, [commitment, selectedAccount]);

  // Every money figure this sheet shows comes from one resolver call — the
  // same function `markAsPaid` runs at the write, so the preview cannot drift
  // from what is actually debited (.claude/rules/review.md class 3). It used
  // to be `amountWatch * rateNum` in the render body, which was the wrong
  // operation in the wrong direction for an EGP commitment paid from a USD
  // account: 5,000 EGP at 49.06 rendered 245,300 USD against a 101.92 debit.
  const preview = useMemo(() => {
    const base = {
      convertedTotal: undefined as { amount: number; currency: Currency } | undefined,
      convertedBelowMin: false,
      previewEgpAmount: undefined as number | undefined,
      // Mockup frame 2: for an EGP commitment the rate row's `≈ … EGP` line
      // would echo the Amount field one row above, so it does not render.
      // Suppression is this flag and never an absent `previewEgpAmount`: that
      // renders the row's placeholder, and covers both "not derivable yet" and
      // the below-floor case set further down.
      previewHidden: commitment?.currency === Currency.EGP,
      // Frame 3: no conversion to show, but the rate is still demanded because
      // `egp_amount` is the ledger's storage currency. That is the semantic —
      // a rate is required and nothing converts — so it is written as exactly
      // that, from the facts already in scope, rather than as a second
      // hand-written currency comparison beside the shared predicate.
      purposeCaption:
        requiresRate && commitment?.currency === selectedAccount?.currency
          ? Strings.commitmentsPayRatePurposeEgp
          : undefined,
    };
    const resolved = deriveResolution(commitment, selectedAccount, amountText, exchangeRateValue);
    if (!commitment || !selectedAccount || !resolved) return base;

    // Below the floor NOTHING confident renders: not the converted line, and
    // not the rate row's `≈ 0.00 EGP` above it. The Amount field carries the
    // reason instead, and the schema blocks the save.
    const convertedBelowMin = resolved.accountNativeAmount < MIN_MONEY_AMOUNT;
    // The gate is currency INEQUALITY, not `requiresRate` — those are
    // different questions, and the USD/USD case answers them differently.
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
      // W1B: membership applies to a prefilled id too. `commitment.account_id`
      // and the last-paid id are both durable copies that outlive an account
      // being archived or deleted, and seeding one opens the sheet already
      // invalid on a field the user never touched.
      if (prefillAccountId && !accounts.some((account) => account.id === prefillAccountId)) {
        prefillAccountId = '';
      }
      if (!prefillAccountId && accounts.length > 0) {
        prefillAccountId = accounts[0].id;
      }

      if (!cancelled) {
        form.reset({
          // #301: housekeeping mints payment rows straight from legacy
          // `commitments.amount`, so `amount_due` can already hold a sub-cent
          // or exponential-notation value; `formatStoredMoneyText` is what
          // makes the prefill re-parse to the number it came from, same
          // contract as edit_transaction.store's amountStr. The `> 0` gate
          // stays: `formatStoredMoneyText(0)` is `'0'`, and today's variable
          // (unfixed-amount) case is an empty field, not a typed zero.
          amountText: prefillAmount > 0 ? formatStoredMoneyText(prefillAmount) : '',
          account_id: prefillAccountId,
          paid_date: toLocalDateString(new Date()),
          exchange_rate: requiresExchangeRate(
            commitment.currency,
            accounts.find((account) => account.id === prefillAccountId)?.currency,
          )
            ? String(rate)
            : undefined,
          notes: undefined,
        });
        setRateOverride(false);
        // Same shape as `rateOverride` above: a module-level flag that outlives
        // the sheet. Dismissing after a failed save leaves it set, so the next
        // open renders "could not save this payment" on a different payment
        // before the user has touched anything.
        setSaveError(false);
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
        // A schema/submit desync on this field now reports through
        // MoneyTextMappingError instead of fabricating a NaN — caught below
        // like any other failure and surfaced as this sheet's existing
        // save-error banner (spec §3.4/§4, W2E).
        amount_paid: parseRequiredMoneyText(data.amountText, 'amountText'),
        account_id: data.account_id,
        paid_date: data.paid_date,
        // This `??` fallback is unreachable once the schema has passed —
        // kept because deleting it costs a cast or a non-null assertion.
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
    } catch {
      // The store logs and rethrows; the sheet stays open, so the user has to
      // be told why. Without this the failure is silent (review.md class 1).
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  // `onValid` clears the save error on entry, but RHF only calls it once
  // validation passes. Without this the sheet shows a field error and the
  // banner from an earlier attempt together, for a submit that never reached
  // the store.
  function onInvalid() {
    setSaveError(false);
  }

  function selectAccount(account: Account) {
    form.setValue('account_id', account.id);
    // The rate is required whenever EITHER side is USD, so a pick that flips
    // `requiresRate` on has to bring the global rate with it — otherwise the
    // rate row renders blank and the schema refuses the save with no value the
    // user ever chose. Precedent: add_transaction.hook.ts `selectAccount`; the
    // condition is this sheet's, not that one's.
    // `!rateOverride` keeps the seed off a rate the user typed themselves. The
    // picker fires `onSelect` for every row including the checked one, so
    // re-tapping the current account is a no-op tap that used to throw that
    // input away. It cannot re-open the blank-field case: `rateOverride` is
    // only reachable from `ExchangeRateRow`, which only renders once
    // `requiresRate` is already true, and every open resets the flag to false.
    if (
      !rateOverride &&
      commitment &&
      requiresExchangeRate(commitment.currency, account.currency)
    ) {
      // Same `isSubmitted` gate as the rate row's own onChange in pay_sheet.tsx:
      // seeding a rate after a failed submit has to clear the error it fixes,
      // and seeding before the first submit must not raise one.
      form.setValue('exchange_rate', String(rate), { shouldValidate: isSubmitted });
      setRateOverride(false);
    }
    setAccountPickerVisible(false);
  }

  // Turning the override off means "use the global rate again", so the field
  // has to be handed that rate back. Leaving whatever the user typed — an
  // empty string, most often — hard-fails the save with no editable field on
  // screen. Precedent: add_transaction.hook.ts `toggleRateOverride`.
  function toggleRateOverride() {
    const next = !rateOverride;
    setRateOverride(next);
    // Same `isSubmitted` gate as the row's own onChange and `selectAccount`'s
    // seed — this is the third write to the field and the three must not drift.
    // Turning the override off after a failed submit IS the user fixing the
    // rate, so D6's required error has to go with the restored value; before
    // the first submit there is nothing to clear and nothing may be raised.
    // Unlike the row's onChange, this site can only ever CLEAR an error:
    // `String(rate)` is a positive global rate, so no input reaches it that the
    // refine would reject. The gate buys staleness removal here, not a
    // suppressed false error — which is why pinning `true` instead is
    // indistinguishable at this site and the test asserts only the clearing.
    if (!next) form.setValue('exchange_rate', String(rate), { shouldValidate: isSubmitted });
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
