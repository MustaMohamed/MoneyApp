import { router } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { applyRateCommit, type ConvertedAmount } from '@/components/ui/form_sheet.helpers';
import { AmountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useRateStale } from '@/modules/currency/store/use_rate_stale.hook';
import {
  resolveAccountStripChips,
  resolveStripSelectedId,
} from '@/modules/transactions/components/transaction_row.helpers';
import {
  requiresExchangeRate,
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
  deriveResolution,
  resolvePayButtonLabel,
  resolvePayConvertedAmount,
  resolvePaySheetStatusMessage,
  resolvePayTrackFootnote,
} from './pay_sheet.helpers';
import { INITIAL_PAY_SHEET_ENTRY, usePaySheetState } from './pay_sheet.state';

/**
 * `'unstorable'` and `'zero-destination'` are deterministic and get their own copy, the shape
 * `resolveTransactionSaveError` uses; everything else keeps the status track's retry line — a repository
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
      // Must match `requiresRate` below on every input: a USD commitment needs a rate before an account is lit.
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

      const needsRate = !!commitment && requiresExchangeRate(commitment.currency, acc?.currency);
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
        commitment?.currency,
        acc?.currency,
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
  const { visible, saving, settled, rateOverride, saveError } = usePaySheetState(
    useShallow((s) => s.entries[owner] ?? INITIAL_PAY_SHEET_ENTRY),
  );
  const setVisible = usePaySheetState.getState().setVisible;
  const setSaving = usePaySheetState.getState().setSaving;
  const setRateOverride = usePaySheetState.getState().setRateOverride;
  const setSaveError = usePaySheetState.getState().setSaveError;
  const setSettled = usePaySheetState.getState().setSettled;

  const accounts = useAccountStore((s) => s.accounts);
  const hasLoaded = useAccountStore((s) => s.hasLoaded);
  const loadAccounts = useAccountStore.getState().loadAccounts;
  const { rate, rateUpdatedAt } = useCurrencyStore(
    useShallow((state) => ({ rate: state.rate, rateUpdatedAt: state.rate_updated_at })),
  );

  const markAsPaid = useCommitmentStore.getState().markAsPaid;

  const schema = useMemo(() => createPaySheetSchema(commitment, accounts), [commitment, accounts]);

  // Counts the prefill's resets, one per open, so a write that outlives its open leaves the next one alone.
  const openGenerationRef = useRef(0);
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

  // `requiresExchangeRate` is wide: a USD commitment needs a rate for its EGP leg before an account is lit.
  const requiresRate =
    commitment !== undefined &&
    requiresExchangeRate(commitment.currency, selectedAccount?.currency);
  const rateStale = useRateStale(rateUpdatedAt, visible && requiresRate);

  // Every figure here comes from the resolver `markAsPaid` runs, so the preview cannot drift.
  const preview = useMemo(() => {
    const base = {
      convertedBelowMin: false,
      writePreview: undefined as PayWritePreview | undefined,
    };
    const { resolved, zeroDestination } = deriveResolution(
      commitment?.currency,
      selectedAccount?.currency,
      amountText,
      exchangeRateValue,
    );
    if (!commitment || !selectedAccount || (!resolved && !zeroDestination)) return base;

    // Below the floor nothing renders; the Amount field carries the reason.
    const convertedBelowMin = resolved ? resolved.accountNativeAmount < MIN_MONEY_AMOUNT : true;
    const writePreview: PayWritePreview | undefined =
      !convertedBelowMin && resolved
        ? {
            amount: resolved.accountNativeAmount,
            currency: resolved.accountCurrency,
            accountName: resolveAccountName(selectedAccount),
          }
        : undefined;
    return { convertedBelowMin, writePreview };
  }, [amountText, commitment, exchangeRateValue, selectedAccount]);

  // At a rate the form holds or the editor drafts.
  function convertedFor(rateText: string): ConvertedAmount | undefined {
    if (!commitment) return undefined;
    return resolvePayConvertedAmount({
      commitmentCurrency: commitment.currency,
      accountCurrency: selectedAccount?.currency,
      amountText,
      rateText,
    });
  }

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

    openGenerationRef.current += 1;
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
    if (!payment || settled) return;
    const startedOpen = openGenerationRef.current;
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
      // Pay stays off and the day stays put until the next open, so the closing sheet cannot pay twice.
      setSettled(owner, true);
      setVisible(owner, false);
      void loadAccounts().catch((error: unknown) =>
        console.error('[paySheet] account revalidation failed:', error),
      );
    } catch (error) {
      // The reload rethrows after publishing `loadError`; a failed reload keeps the failed-write line.
      await loadAccounts().catch(() => undefined);
      // A reopen during the reload owns the form now, so this failure is not its to show.
      if (openGenerationRef.current !== startedOpen) return;
      const reloaded = useAccountStore.getState();
      if (!reloaded.loadError && !reloaded.accounts.some((a) => a.id === data.account_id)) {
        form.setError('account_id', {
          type: 'custom',
          message: Strings.commitmentsPayErrAccountUnavailable,
        });
      } else {
        // The store logs and rethrows; without this line the failure is silent.
        setSaveError(owner, resolvePaySheetSaveError(error));
      }
    } finally {
      setSaving(owner, false);
    }
  }

  // RHF calls `onValid` only when validation passes, so a stale status track line outlives a failed submit.
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

  function commitRate(text: string): boolean {
    return applyRateCommit({
      text,
      storedRate: rate,
      clearError: () => setSaveError(owner, undefined),
      setRateOverride: (override) => setRateOverride(owner, override),
      setExchangeRate: (exchangeRate) =>
        form.setValue('exchange_rate', exchangeRate, { shouldValidate: isSubmitted }),
    });
  }

  function requestAccountCreation() {
    usePaySheetState.getState().requestAccountCreation(owner);
  }

  // `/accounts/*` is on the `(app)` Stack, so the href stays bare.
  function handleCloseComplete() {
    if (usePaySheetState.getState().completeClose(owner) === 'addAccount') {
      router.push('/accounts/add_account');
    }
  }

  // The hero has already masked the text.
  function setAmountText(text: string) {
    setTypedDecimal(form, 'amountText', text, true, isSubmitted);
  }

  const fieldErrors = form.formState.errors;
  const pressErrors: PaySheetFieldErrors = {
    amount: fieldErrors.amountText?.message,
    account: fieldErrors.account_id?.message,
    rate: fieldErrors.exchange_rate?.message,
  };
  // An account archived or deleted under the open sheet rings the strip live, counted only once a press marks it.
  const accountUnavailable = hasLoaded && accountId !== '' && selectedAccount === undefined;
  // The RHF error wins each slot; the live flags are the only source of them before a press.
  const errors: PaySheetFieldErrors = {
    ...pressErrors,
    account:
      pressErrors.account ??
      (accountUnavailable ? Strings.commitmentsPayErrAccountUnavailable : undefined),
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
      settled,
      requiresRate,
      visible,
      noAccounts: hasLoaded && accounts.length === 0,
      exchangeRateValue,
      rateUpdatedAt,
      rateStale,
      storedRate: rate,
      converted: convertedFor(exchangeRateValue ?? ''),
      amountText,
      paidDate,
      note: notes ?? '',
      stripChips,
      errors,
      trackFootnote,
      // A fault counts only once a press marked it, so the live converted line counts nothing.
      statusMessage: resolvePaySheetStatusMessage(pressErrors, saveError),
      ctaLabel: commitment
        ? resolvePayButtonLabel(amountText, commitment.currency)
        : Strings.commitmentsPayCtaBare,
    },
    onSubmit: form.handleSubmit(onValid, onInvalid),
    selectAccount,
    setVisible: (v: boolean) => setVisible(owner, v),
    commitRate,
    convertedFor,
    requestAccountCreation,
    handleCloseComplete,
    setAmountText,
    setPaidDate: (iso: string) => form.setValue('paid_date', iso, { shouldValidate: true }),
    setNote: (text: string) => form.setValue('notes', text),
  };
}
