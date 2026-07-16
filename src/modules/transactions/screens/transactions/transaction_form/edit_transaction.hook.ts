import { useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { CategoryType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Category } from '@/database/entities/category.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  useTransactionStore,
  type UpdateTransactionInput,
} from '@/modules/transactions/store/transaction.store';
import { roundMoney } from '@/utils/money';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { isSameBudgetEligibility, resolveBudgetAssignment } from './budget_assignment.helpers';
import { buildDefaultsFromTx, type EditTransactionFormValues } from './edit_transaction.helpers';
import { useEditTransactionState } from './edit_transaction.state';
import { useEditTransactionStore } from './edit_transaction.store';

function createEditSchema(type: TransactionType, requiresBudgetSelection: boolean) {
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  return z
    .object({
      amount: z
        .number({ error: Strings.addTxErrAmountRequired })
        .refine((v) => v > 0, Strings.addTxErrAmountZero),
      categoryId: isTransferOrCC ? z.string() : z.string().min(1, Strings.addTxErrCategoryRequired),
      budgetId: z.string(),
      note: z.string(),
      date: z.string().min(1),
      time: z.string().min(1),
      exchangeRate: z.string(),
    })
    .superRefine((data, context) => {
      if (requiresBudgetSelection && !data.budgetId) {
        context.addIssue({
          code: 'custom',
          message: Strings.addTxErrBudgetRequired,
          path: ['budgetId'],
        });
      }
    });
}

export function useEditTransaction(
  initialTx: Transaction,
  onClose: () => void,
  onSaved?: () => void,
) {
  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore.getState().loadAccounts;
  const categories = useCategoryStore.useState.categories();
  const { rate, rateUpdatedAt } = useCurrencyStore(
    useShallow((s) => ({
      rate: s.rate,
      rateUpdatedAt: s.rate_updated_at,
    })),
  );
  const updateTransaction = useTransactionStore.getState().updateTransaction;
  const { amountStr, availableBudgets, budgetId } = useEditTransactionStore(
    useShallow((state) => ({
      amountStr: state.amountStr,
      availableBudgets: state.availableBudgets,
      budgetId: state.budgetId,
    })),
  );
  const setAmountStr = useEditTransactionStore.getState().setAmountStr;
  const handleNumpad = useEditTransactionStore.getState().handleNumpad;
  const setAvailableBudgets = useEditTransactionStore.getState().setAvailableBudgets;
  const setBudgetId = useEditTransactionStore.getState().setBudgetId;
  const {
    visible,
    saving,
    showCategoryPicker,
    showBudgetPicker,
    budgetsLoading,
    budgetLookupVersion,
    budgetLookupError,
    errorMessage,
    preserveBudgetNull,
    rateOverride,
  } = useEditTransactionState(
    useShallow((s) => ({
      visible: s.visible,
      saving: s.saving,
      showCategoryPicker: s.showCategoryPicker,
      showBudgetPicker: s.showBudgetPicker,
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
  const setBudgetsLoading = useEditTransactionState.getState().setBudgetsLoading;
  const setBudgetLookupError = useEditTransactionState.getState().setBudgetLookupError;
  const setErrorMessage = useEditTransactionState.getState().setErrorMessage;
  const retryBudgetLookup = useEditTransactionState.getState().retryBudgetLookup;
  const clearError = useEditTransactionState.getState().clearError;
  const setPreserveBudgetNull = useEditTransactionState.getState().setPreserveBudgetNull;
  const setRateOverride = useEditTransactionState.getState().setRateOverride;

  const type = initialTx.type;
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const requiresBudgetSelection =
    type === TransactionType.Expense &&
    availableBudgets.length > 1 &&
    !budgetId &&
    !preserveBudgetNull;
  const schema = useMemo(
    () => createEditSchema(type, requiresBudgetSelection),
    [requiresBudgetSelection, type],
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

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === initialTx.account_id) ?? null,
    [accounts, initialTx.account_id],
  );
  const selectedToAccount = useMemo(
    () =>
      initialTx.to_account_id
        ? (accounts.find((a) => a.id === initialTx.to_account_id) ?? null)
        : null,
    [accounts, initialTx.to_account_id],
  );
  const isUSD = selectedAccount?.currency === Currency.USD;
  const isToUSD = selectedToAccount?.currency === Currency.USD;
  const requiresRate = isUSD || (isTransferOrCC && isToUSD);

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
        (c) =>
          c.type === (type === TransactionType.Income ? CategoryType.Income : CategoryType.Expense),
      ),
    [categories, type],
  );

  const errors = {
    amount: form.formState.errors.amount?.message,
    category: form.formState.errors.categoryId?.message,
    budget: budgetLookupError ?? form.formState.errors.budgetId?.message,
    rate: form.formState.errors.exchangeRate?.message,
  };

  useEffect(() => {
    const parsed = parseFloat(amountStr);
    form.setValue('amount', isNaN(parsed) ? 0 : parsed);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- form is RHF's stable object; identity never changes
  }, [amountStr]);

  useEffect(() => {
    if (!visible) {
      form.reset(buildDefaultsFromTx(initialTx, rate));
      setRateOverride(initialTx.exchange_rate !== null);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- reset-on-close effect; only triggers on visibility toggle; deps stable within session
  }, [visible]);

  const budgetRequestRef = useRef(0);
  useEffect(() => {
    const request = ++budgetRequestRef.current;
    if (type !== TransactionType.Expense || !categoryId) {
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
    type,
  ]);

  async function onValid(data: EditTransactionFormValues) {
    const formState = useEditTransactionState.getState();
    if (formState.saving || formState.budgetsLoading || formState.budgetLookupError) return;
    setErrorMessage(undefined);
    setSaving(true);
    try {
      const fromCurrency = selectedAccount?.currency ?? Currency.EGP;
      const toCurrency = selectedToAccount?.currency;
      const parsedRate =
        data.exchangeRate && requiresRate ? parseFloat(data.exchangeRate) : undefined;

      const egp_amount =
        fromCurrency === Currency.USD && parsedRate
          ? roundMoney(data.amount * parsedRate)
          : data.amount;

      let to_amount: number | undefined;
      if (isTransferOrCC && toCurrency !== undefined) {
        if (fromCurrency === Currency.EGP && toCurrency === Currency.USD && parsedRate) {
          to_amount = roundMoney(data.amount / parsedRate);
        } else if (fromCurrency === Currency.USD && toCurrency === Currency.EGP) {
          to_amount = egp_amount;
        } else {
          to_amount = data.amount;
        }
        if (type === TransactionType.CCPayment) to_amount = egp_amount;
      }

      const update: UpdateTransactionInput = {
        amount: data.amount,
        currency: fromCurrency,
        egp_amount,
        to_amount: to_amount ?? null,
        exchange_rate: parsedRate ?? null,
        category_id: !isTransferOrCC ? data.categoryId : null,
        budget_id: type === TransactionType.Expense ? data.budgetId || null : null,
        note: data.note.trim() || null,
        transaction_date: data.date,
        transaction_time: initialTx.transaction_time, // preserved — no time UI
      };
      await updateTransaction(initialTx.id, update);
      await loadAccounts();
      if (onSaved) {
        onSaved();
      } else {
        onClose();
      }
    } catch {
      setErrorMessage(Strings.transactionSaveError);
    } finally {
      setSaving(false);
    }
  }

  function toggleRateOverride() {
    const next = !rateOverride;
    setRateOverride(next);
    if (!next) form.setValue('exchangeRate', String(rate));
  }

  function selectCategory(category: Category) {
    clearError();
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
      amountStr,
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
      isUSD: requiresRate,
      isTransferOrCC,
      errors,
      errorMessage,
      budgetLookupError,
      saving,
      visibleCategories,
      showCategoryPicker,
      showBudgetPicker,
      budgetsLoading,
      availableBudgets,
      showBudgetField:
        type === TransactionType.Expense &&
        Boolean(categoryId) &&
        (budgetsLoading ||
          Boolean(budgetLookupError) ||
          Boolean(budgetId) ||
          availableBudgets.length > 0),
      rateUpdatedAt,
    },
    setAmountStr: (value: string) => {
      clearError();
      setAmountStr(value);
    },
    handleNumpad: (action: 'digit' | 'decimal' | 'backspace', value?: string) => {
      clearError();
      handleNumpad(action, value);
    },
    setDate: (v: string) => {
      clearError();
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
    selectCategory,
    selectBudget,
    retryBudgetLookup,
    handleSave: form.handleSubmit(onValid),
  };
}
