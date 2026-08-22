import { useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import type { Category } from '@/modules/categories/entities/category.entity';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { resolveTransactionAmounts } from '@/modules/transactions/domain/transaction_amounts';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  useTransactionStore,
  type UpdateTransactionInput,
} from '@/modules/transactions/store/transaction.store';
import { MIN_MONEY_AMOUNT } from '@/utils/money';
import { parseDecimalText, parsePositiveDecimal } from '@/utils/parse_decimal';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { isSameBudgetEligibility, resolveBudgetAssignment } from './budget_assignment.helpers';
import { buildDefaultsFromTx, type EditTransactionFormValues } from './edit_transaction.helpers';
import { useEditTransactionState } from './edit_transaction.state';
import { useEditTransactionStore } from './edit_transaction.store';
import {
  resolveTransactionFormSemantics,
  resolveTransactionSaveError,
} from './transaction_form.helpers';
import { type TransactionFormPrerequisiteController } from './transaction_form_prerequisites.helpers';

const ignorePrerequisiteRetry = () => {};

function createEditSchema(
  type: TransactionType,
  categoryType: ReturnType<typeof resolveTransactionFormSemantics>['categoryType'],
  categories: Category[],
  requiresBudgetSelection: boolean,
  requiresRate: boolean,
) {
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  return z
    .object({
      amount: z
        .number({ error: Strings.addTxErrAmountRequired })
        .refine((v) => v >= MIN_MONEY_AMOUNT, Strings.addTxErrAmountZero),
      categoryId: isTransferOrCC ? z.string() : z.string().min(1, Strings.addTxErrCategoryRequired),
      budgetId: z.string(),
      note: z.string(),
      date: z.string().min(1),
      time: z.string().min(1),
      exchangeRate: z.string(),
    })
    .superRefine((data, context) => {
      if (!isTransferOrCC && data.categoryId) {
        const category = categories.find((candidate) => candidate.id === data.categoryId);
        if (!category || category.type !== categoryType) {
          context.addIssue({
            code: 'custom',
            message: Strings.addTxErrCategoryMismatch,
            path: ['categoryId'],
          });
        }
      }
      if (requiresBudgetSelection && !data.budgetId) {
        context.addIssue({
          code: 'custom',
          message: Strings.addTxErrBudgetRequired,
          path: ['budgetId'],
        });
      }
      if (requiresRate) {
        if (!data.exchangeRate) {
          context.addIssue({
            code: 'custom',
            message: Strings.addTxErrRateRequired,
            path: ['exchangeRate'],
          });
        } else if (parsePositiveDecimal(data.exchangeRate) === undefined) {
          context.addIssue({
            code: 'custom',
            message: Strings.addTxErrRateInvalid,
            path: ['exchangeRate'],
          });
        }
      }
    });
}

export function useEditTransaction(
  initialTx: Transaction,
  onClose: () => void,
  onSaved?: () => void,
  prerequisites?: TransactionFormPrerequisiteController,
) {
  const { accounts, accountLookup } = useAccountStore(
    useShallow((state) => ({
      accounts: state.accounts,
      accountLookup: state.accountLookup,
    })),
  );
  const accountsLoaded = useAccountStore((state) => state.hasLoaded);
  const loadAccounts = useAccountStore.getState().loadAccounts;
  const categories = useCategoryStore((state) => state.categories);
  const categoriesLoaded = useCategoryStore((state) => state.hasLoaded);
  const { rate, rateUpdatedAt } = useCurrencyStore(
    useShallow((s) => ({
      rate: s.rate,
      rateUpdatedAt: s.rate_updated_at,
    })),
  );
  const updateTransaction = useTransactionStore.getState().updateTransaction;
  const { availableBudgets, budgetId } = useEditTransactionStore(
    useShallow((state) => ({
      availableBudgets: state.availableBudgets,
      budgetId: state.budgetId,
    })),
  );
  const setAmountStr = useEditTransactionStore.getState().setAmountStr;
  const setAvailableBudgets = useEditTransactionStore.getState().setAvailableBudgets;
  const setBudgetId = useEditTransactionStore.getState().setBudgetId;
  const {
    saving,
    showCategoryPicker,
    showBudgetPicker,
    closingPickers,
    budgetsLoading,
    budgetLookupVersion,
    budgetLookupError,
    errorMessage,
    preserveBudgetNull,
    rateOverride,
  } = useEditTransactionState(
    useShallow((s) => ({
      saving: s.saving,
      showCategoryPicker: s.showCategoryPicker,
      showBudgetPicker: s.showBudgetPicker,
      closingPickers: s.closingPickers,
      budgetsLoading: s.budgetsLoading,
      budgetLookupVersion: s.budgetLookupVersion,
      budgetLookupError: s.budgetLookupError,
      errorMessage: s.errorMessage,
      preserveBudgetNull: s.preserveBudgetNull,
      rateOverride: s.rateOverride,
    })),
  );
  const setSaving = useEditTransactionState.getState().setSaving;
  const setShowCategoryPicker = useEditTransactionState.getState().setShowCategoryPicker;
  const setShowBudgetPicker = useEditTransactionState.getState().setShowBudgetPicker;
  const completePickerClose = useEditTransactionState.getState().completePickerClose;
  const setBudgetsLoading = useEditTransactionState.getState().setBudgetsLoading;
  const setBudgetLookupError = useEditTransactionState.getState().setBudgetLookupError;
  const setErrorMessage = useEditTransactionState.getState().setErrorMessage;
  const retryBudgetLookup = useEditTransactionState.getState().retryBudgetLookup;
  const clearError = useEditTransactionState.getState().clearError;
  const setPreserveBudgetNull = useEditTransactionState.getState().setPreserveBudgetNull;
  const setRateOverride = useEditTransactionState.getState().setRateOverride;

  const effectiveDataStatus =
    prerequisites?.status ?? (accountsLoaded && categoriesLoaded ? 'ready' : 'loading');

  const type = initialTx.type;
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const contextualAccounts = useMemo(
    () => new Map([...accounts, ...accountLookup].map((account) => [account.id, account])),
    [accountLookup, accounts],
  );
  const selectedAccount = contextualAccounts.get(initialTx.account_id) ?? null;
  const selectedToAccount = initialTx.to_account_id
    ? (contextualAccounts.get(initialTx.to_account_id) ?? null)
    : null;
  const semantics = useMemo(
    () => resolveTransactionFormSemantics(type, selectedAccount?.type),
    [selectedAccount?.type, type],
  );
  const isUSD = selectedAccount?.currency === Currency.USD;
  const isToUSD = selectedToAccount?.currency === Currency.USD;
  const requiresRate = isUSD || (isTransferOrCC && isToUSD);
  const requiresBudgetSelection =
    semantics.usesBudget && availableBudgets.length > 1 && !budgetId && !preserveBudgetNull;
  const schema = useMemo(
    () =>
      createEditSchema(
        type,
        semantics.categoryType,
        categories,
        requiresBudgetSelection,
        requiresRate,
      ),
    [categories, requiresBudgetSelection, requiresRate, semantics.categoryType, type],
  );

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildDefaultsFromTx(initialTx, rate),
  });

  const categoryId = form.watch('categoryId');
  const formBudgetId = form.watch('budgetId');
  const note = form.watch('note');
  const date = form.watch('date');
  const exchangeRate = form.watch('exchangeRate');

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const selectedBudget = useMemo(
    () => availableBudgets.find((budget) => budget.id === budgetId) ?? null,
    [availableBudgets, budgetId],
  );
  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) => semantics.categoryType !== undefined && c.type === semantics.categoryType,
      ),
    [categories, semantics.categoryType],
  );

  const errors = {
    amount: form.formState.errors.amount?.message,
    category: form.formState.errors.categoryId?.message,
    budget: budgetLookupError ?? form.formState.errors.budgetId?.message,
    rate: form.formState.errors.exchangeRate?.message,
  };

  const budgetRequestRef = useRef(0);
  useEffect(() => {
    const request = ++budgetRequestRef.current;
    if (!semantics.usesBudget || !categoryId) {
      setBudgetLookupError(undefined);
      setAvailableBudgets([]);
      setBudgetId(undefined);
      form.setValue('budgetId', '');
      setBudgetsLoading(false);
      setPreserveBudgetNull(false);
      return;
    }

    const sameEligibility = isSameBudgetEligibility(initialTx, categoryId, date);
    const preservedBudgetId = sameEligibility
      ? (budgetId ?? initialTx.budget_id ?? undefined)
      : undefined;
    let active = true;
    setBudgetLookupError(undefined);
    setBudgetsLoading(true);
    setAvailableBudgets([]);
    setBudgetId(preservedBudgetId);
    form.setValue('budgetId', preservedBudgetId ?? '');
    void budgetRepository
      .getBudgetsForCategoryMonth(categoryId, date.slice(0, 7))
      .then((budgets) => {
        if (!active || request !== budgetRequestRef.current) return;
        const preserveNull =
          initialTx.budget_id === null && isSameBudgetEligibility(initialTx, categoryId, date);
        const resolution = resolveBudgetAssignment({
          budgets,
          currentBudgetId: preservedBudgetId,
          preserveNull,
        });
        setPreserveBudgetNull(preserveNull);
        setAvailableBudgets(budgets);
        setBudgetId(resolution.budgetId);
        form.setValue('budgetId', resolution.budgetId ?? '');
      })
      .catch(() => {
        if (!active || request !== budgetRequestRef.current) return;
        setAvailableBudgets([]);
        setBudgetId(preservedBudgetId);
        form.setValue('budgetId', preservedBudgetId ?? '');
        setPreserveBudgetNull(initialTx.budget_id === null && sameEligibility);
        setBudgetLookupError(Strings.addTxBudgetLookupError);
      })
      .finally(() => {
        if (active && request === budgetRequestRef.current) setBudgetsLoading(false);
      });
    return () => {
      active = false;
    };
    // `budgetId` is the current selection, not an effect trigger.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [
    budgetLookupVersion,
    categoryId,
    date,
    setAvailableBudgets,
    setBudgetId,
    setBudgetLookupError,
    setBudgetsLoading,
    setPreserveBudgetNull,
    semantics.usesBudget,
    type,
  ]);

  async function onValid(data: EditTransactionFormValues) {
    const formState = useEditTransactionState.getState();
    if (
      effectiveDataStatus !== 'ready' ||
      formState.saving ||
      formState.budgetsLoading ||
      formState.budgetLookupError
    )
      return;
    setErrorMessage(undefined);
    setSaving(true);
    try {
      const fromCurrency = selectedAccount?.currency ?? Currency.EGP;
      const toCurrency = selectedToAccount?.currency;
      const parsedRate = requiresRate ? parsePositiveDecimal(data.exchangeRate) : undefined;

      const amounts = resolveTransactionAmounts({
        type,
        amount: data.amount,
        sourceCurrency: fromCurrency,
        destinationCurrency: toCurrency,
        exchangeRate: parsedRate,
      });

      const update: UpdateTransactionInput = {
        amount: data.amount,
        currency: fromCurrency,
        egp_amount: amounts.egpAmount,
        to_amount: amounts.toAmount,
        exchange_rate: amounts.exchangeRate,
        category_id: !isTransferOrCC ? data.categoryId : null,
        budget_id: semantics.usesBudget ? data.budgetId || null : null,
        note: data.note.trim() || null,
        transaction_date: data.date,
        transaction_time: initialTx.transaction_time, // preserved — no time UI
      };
      await updateTransaction(initialTx.id, update);
      if (onSaved) {
        onSaved();
      } else {
        onClose();
      }
      void loadAccounts().catch(() => undefined);
    } catch (error) {
      setErrorMessage(resolveTransactionSaveError(error));
    } finally {
      setSaving(false);
    }
  }

  function invalidateBudgetEligibility(nextCategoryId: string, nextDate: string) {
    if (
      !semantics.usesBudget ||
      !nextCategoryId ||
      (nextCategoryId === categoryId && nextDate.slice(0, 7) === date.slice(0, 7))
    ) {
      return;
    }
    budgetRequestRef.current += 1;
    setBudgetLookupError(undefined);
    setBudgetsLoading(true);
    setAvailableBudgets([]);
    setBudgetId(undefined);
    setPreserveBudgetNull(false);
    form.setValue('budgetId', '');
  }

  function toggleRateOverride() {
    const next = !rateOverride;
    setRateOverride(next);
    if (!next) form.setValue('exchangeRate', String(rate));
  }

  function selectCategory(category: Category) {
    clearError();
    invalidateBudgetEligibility(category.id, date);
    form.setValue('categoryId', category.id);
    setShowCategoryPicker(false);
  }

  function selectBudget(budget: Budget) {
    clearError();
    setBudgetId(budget.id);
    form.setValue('budgetId', budget.id, { shouldValidate: true });
    setShowBudgetPicker(false);
  }

  return {
    state: {
      type,
      selectedAccount,
      selectedToAccount,
      selectedCategory,
      selectedBudget,
      categoryId,
      budgetId: formBudgetId,
      note,
      date,
      exchangeRate,
      rateOverride,
      isCardCredit: semantics.isCardCredit,
      typeLabel: semantics.typeLabel,
      typeSupportingText: semantics.supportingText,
      isUSD: requiresRate,
      isTransferOrCC,
      errors,
      errorMessage,
      budgetLookupError,
      formDataReady: effectiveDataStatus === 'ready',
      formDataLoadError: effectiveDataStatus === 'error',
      saving,
      visibleCategories,
      showCategoryPicker,
      showBudgetPicker,
      closingPickers,
      budgetsLoading,
      availableBudgets,
      showBudgetField:
        semantics.usesBudget &&
        Boolean(categoryId) &&
        (budgetsLoading ||
          Boolean(budgetLookupError) ||
          Boolean(budgetId) ||
          availableBudgets.length > 0),
      rateUpdatedAt,
    },
    setAmountStr: (value: string) => {
      if (useEditTransactionState.getState().errorMessage) clearError();
      if (form.formState.errors.amount) form.clearErrors('amount');
      setAmountStr(value);
    },
    setDate: (v: string) => {
      clearError();
      invalidateBudgetEligibility(categoryId, v);
      form.setValue('date', v);
    },
    setNote: (v: string) => {
      clearError();
      form.setValue('note', v);
    },
    setExchangeRate: (v: string) => {
      clearError();
      form.setValue('exchangeRate', v);
    },
    toggleRateOverride,
    setShowCategoryPicker,
    setShowBudgetPicker,
    completePickerClose,
    selectCategory,
    selectBudget,
    retryBudgetLookup,
    retryFormData: prerequisites?.retry ?? ignorePrerequisiteRetry,
    handleSave: () => {
      const amountStr = useEditTransactionStore.getState().amountStr;
      form.setValue('amount', parseDecimalText(amountStr) ?? Number.NaN);
      return form.handleSubmit(onValid)();
    },
  };
}
