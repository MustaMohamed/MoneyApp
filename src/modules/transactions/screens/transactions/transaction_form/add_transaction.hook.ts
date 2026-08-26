import { useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import type { Category } from '@/modules/categories/entities/category.entity';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import {
  requiresExchangeRate,
  resolveTransactionAmounts,
} from '@/modules/transactions/domain/transaction_amounts';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { MIN_MONEY_AMOUNT } from '@/utils/money';
import { parseDecimalText, parseRateText } from '@/utils/parse_decimal';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useAddTransactionState } from './add_transaction.state';
import { useAddTransactionStore } from './add_transaction.store';
import { resolveBudgetAssignment } from './budget_assignment.helpers';
import {
  resolveTransactionFormSemantics,
  resolveTransactionSaveError,
  toTransactionTimestamp,
} from './transaction_form.helpers';
import { type TransactionFormPrerequisiteController } from './transaction_form_prerequisites.helpers';

export type AddTransactionFormValues = {
  amount: number;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  budgetId: string;
  note: string;
  date: string;
  exchangeRate: string;
};

const ignorePrerequisiteRetry = () => {};

function createSchema(
  type: TransactionType,
  accounts: Account[],
  categories: Category[],
  hasMultipleBudgets: boolean,
) {
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  return z
    .object({
      amount: z
        .number({ error: Strings.addTxErrAmountRequired })
        .refine((v) => v >= MIN_MONEY_AMOUNT, Strings.addTxErrAmountZero),
      accountId: z
        .string()
        .min(1, isTransferOrCC ? Strings.addTxErrFromRequired : Strings.addTxErrAccountRequired),
      toAccountId: z.string(),
      categoryId: z.string(),
      budgetId: z.string(),
      note: z.string(),
      date: z.string().min(1),
      exchangeRate: z.string(),
    })
    .superRefine((data, ctx) => {
      if (isTransferOrCC) {
        if (!data.toAccountId) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrToRequired,
            path: ['toAccountId'],
          });
        } else if (data.accountId === data.toAccountId) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrSameAccount,
            path: ['toAccountId'],
          });
        }
      } else if (!data.categoryId) {
        ctx.addIssue({
          code: 'custom',
          message: Strings.addTxErrCategoryRequired,
          path: ['categoryId'],
        });
      } else {
        const account = accounts.find((candidate) => candidate.id === data.accountId);
        const semantics = resolveTransactionFormSemantics(type, account?.type);
        const category = categories.find((candidate) => candidate.id === data.categoryId);
        if (!category || category.type !== semantics.categoryType) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrCategoryMismatch,
            path: ['categoryId'],
          });
        }
      }

      const account = accounts.find((candidate) => candidate.id === data.accountId);
      const semantics = resolveTransactionFormSemantics(type, account?.type);
      if (semantics.usesBudget && hasMultipleBudgets && !data.budgetId) {
        ctx.addIssue({
          code: 'custom',
          message: Strings.addTxErrBudgetRequired,
          path: ['budgetId'],
        });
      }

      const acc = account;
      const toAcc = accounts.find((a) => a.id === data.toAccountId);

      if (type === TransactionType.CCPayment) {
        if (acc?.type === AccountType.CreditCard) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrCcPaymentSourceMustBeAsset,
            path: ['accountId'],
          });
        }
        if (toAcc && toAcc.type !== AccountType.CreditCard) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrCcPaymentTargetMustBeCC,
            path: ['toAccountId'],
          });
        }
      }

      if (type === TransactionType.Transfer) {
        if (acc?.type === AccountType.CreditCard) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrTransferNoCc,
            path: ['accountId'],
          });
        }
        if (toAcc?.type === AccountType.CreditCard) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrTransferNoCc,
            path: ['toAccountId'],
          });
        }
      }

      const needsRate = requiresExchangeRate(
        acc?.currency,
        isTransferOrCC ? toAcc?.currency : undefined,
      );
      if (needsRate) {
        if (!data.exchangeRate) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrRateRequired,
            path: ['exchangeRate'],
          });
        } else {
          if (parseRateText(data.exchangeRate) === undefined) {
            ctx.addIssue({
              code: 'custom',
              message: Strings.addTxErrRateInvalid,
              path: ['exchangeRate'],
            });
          }
        }
      }
    });
}

export function useAddTransaction(
  onClose: () => void,
  prerequisites?: TransactionFormPrerequisiteController,
) {
  const accounts = useAccountStore((state) => state.accounts);
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
  const addTransaction = useTransactionStore.getState().addTransaction;
  const { type, availableBudgets, budgetId } = useAddTransactionStore(
    useShallow((s) => ({
      type: s.type,
      availableBudgets: s.availableBudgets,
      budgetId: s.budgetId,
    })),
  );
  const setType = useAddTransactionStore.getState().setType;
  const setAmountStr = useAddTransactionStore.getState().setAmountStr;
  const setAvailableBudgets = useAddTransactionStore.getState().setAvailableBudgets;
  const setBudgetId = useAddTransactionStore.getState().setBudgetId;
  const {
    saving,
    showAccountPicker,
    showToPicker,
    showCategoryPicker,
    showBudgetPicker,
    closingPickers,
    budgetsLoading,
    budgetLookupVersion,
    budgetLookupError,
    errorMessage,
    rateOverride,
  } = useAddTransactionState(
    useShallow((s) => ({
      saving: s.saving,
      showAccountPicker: s.showAccountPicker,
      showToPicker: s.showToPicker,
      showCategoryPicker: s.showCategoryPicker,
      showBudgetPicker: s.showBudgetPicker,
      closingPickers: s.closingPickers,
      budgetsLoading: s.budgetsLoading,
      budgetLookupVersion: s.budgetLookupVersion,
      budgetLookupError: s.budgetLookupError,
      errorMessage: s.errorMessage,
      rateOverride: s.rateOverride,
    })),
  );
  const setSaving = useAddTransactionState.getState().setSaving;
  const setShowAccountPicker = useAddTransactionState.getState().setShowAccountPicker;
  const setShowToPicker = useAddTransactionState.getState().setShowToPicker;
  const setShowCategoryPicker = useAddTransactionState.getState().setShowCategoryPicker;
  const setShowBudgetPicker = useAddTransactionState.getState().setShowBudgetPicker;
  const completePickerClose = useAddTransactionState.getState().completePickerClose;
  const setBudgetsLoading = useAddTransactionState.getState().setBudgetsLoading;
  const setBudgetLookupError = useAddTransactionState.getState().setBudgetLookupError;
  const setErrorMessage = useAddTransactionState.getState().setErrorMessage;
  const retryBudgetLookup = useAddTransactionState.getState().retryBudgetLookup;
  const clearError = useAddTransactionState.getState().clearError;
  const setRateOverride = useAddTransactionState.getState().setRateOverride;

  const effectiveDataStatus =
    prerequisites?.status ?? (accountsLoaded && categoriesLoaded ? 'ready' : 'loading');

  const schema = useMemo(
    () => createSchema(type, accounts, categories, availableBudgets.length > 1),
    [accounts, availableBudgets.length, categories, type],
  );

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      amount: 0,
      accountId: '',
      toAccountId: '',
      categoryId: '',
      budgetId: '',
      note: '',
      date: toTransactionTimestamp(new Date()).date,
      exchangeRate: String(rate),
    },
  });

  const accountId = form.watch('accountId');
  const toAccountId = form.watch('toAccountId');
  const categoryId = form.watch('categoryId');
  const formBudgetId = form.watch('budgetId');
  const note = form.watch('note');
  const date = form.watch('date');
  const exchangeRate = form.watch('exchangeRate');

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? null,
    [accounts, accountId],
  );
  const selectedToAccount = useMemo(
    () => accounts.find((a) => a.id === toAccountId) ?? null,
    [accounts, toAccountId],
  );
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const selectedBudget = useMemo(
    () => availableBudgets.find((budget) => budget.id === budgetId) ?? null,
    [availableBudgets, budgetId],
  );

  const semantics = useMemo(
    () => resolveTransactionFormSemantics(type, selectedAccount?.type),
    [selectedAccount?.type, type],
  );

  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const requiresRate = requiresExchangeRate(
    selectedAccount?.currency,
    isTransferOrCC ? selectedToAccount?.currency : undefined,
  );

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) => semantics.categoryType !== undefined && c.type === semantics.categoryType,
      ),
    [categories, semantics.categoryType],
  );

  const accountsForFrom = useMemo(() => {
    if (type === TransactionType.CCPayment || type === TransactionType.Transfer) {
      return accounts.filter((a) => a.type !== AccountType.CreditCard);
    }
    return accounts;
  }, [accounts, type]);

  const accountsForTo = useMemo(() => {
    if (type === TransactionType.CCPayment) {
      return accounts.filter((a) => a.type === AccountType.CreditCard);
    }
    if (type === TransactionType.Transfer) {
      return accounts.filter((a) => a.type !== AccountType.CreditCard);
    }
    return accounts;
  }, [accounts, type]);

  const errors = {
    amount: form.formState.errors.amount?.message,
    account: form.formState.errors.accountId?.message,
    toAccount: form.formState.errors.toAccountId?.message,
    category: form.formState.errors.categoryId?.message,
    budget: budgetLookupError ?? form.formState.errors.budgetId?.message,
    rate: form.formState.errors.exchangeRate?.message,
  };

  // Clear type-dependent fields when type changes
  useEffect(() => {
    form.setValue('toAccountId', '');
    form.setValue('categoryId', '');
    form.setValue('budgetId', '');
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const budgetRequestRef = useRef(0);
  useEffect(() => {
    const request = ++budgetRequestRef.current;
    if (!semantics.usesBudget || !categoryId) {
      setBudgetLookupError(undefined);
      setAvailableBudgets([]);
      setBudgetId(undefined);
      form.setValue('budgetId', '');
      setBudgetsLoading(false);
      return;
    }

    let active = true;
    setBudgetLookupError(undefined);
    setBudgetsLoading(true);
    setAvailableBudgets([]);
    setBudgetId(undefined);
    form.setValue('budgetId', '');
    void budgetRepository
      .getBudgetsForCategoryMonth(categoryId, date.slice(0, 7))
      .then((budgets) => {
        if (!active || request !== budgetRequestRef.current) return;
        const resolution = resolveBudgetAssignment({
          budgets,
          currentBudgetId: budgetId,
          preserveNull: false,
        });
        setAvailableBudgets(budgets);
        setBudgetId(resolution.budgetId);
        form.setValue('budgetId', resolution.budgetId ?? '');
      })
      .catch(() => {
        if (!active || request !== budgetRequestRef.current) return;
        setAvailableBudgets([]);
        setBudgetId(undefined);
        form.setValue('budgetId', '');
        setBudgetLookupError(Strings.addTxBudgetLookupError);
      })
      .finally(() => {
        if (active && request === budgetRequestRef.current) setBudgetsLoading(false);
      });
    return () => {
      active = false;
    };
    // `budgetId` is deliberately read as the current selection, not an effect trigger.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [
    budgetLookupVersion,
    categoryId,
    date,
    setAvailableBudgets,
    setBudgetId,
    setBudgetLookupError,
    setBudgetsLoading,
    semantics.usesBudget,
    type,
  ]);

  async function onValid(data: AddTransactionFormValues) {
    const formState = useAddTransactionState.getState();
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
      const parsedRate = requiresRate ? parseRateText(data.exchangeRate) : undefined;

      const amounts = resolveTransactionAmounts({
        type,
        amount: data.amount,
        sourceCurrency: fromCurrency,
        destinationCurrency: toCurrency,
        exchangeRate: parsedRate,
      });

      const submittedAt = toTransactionTimestamp(new Date());
      await addTransaction({
        type,
        amount: amounts.amount,
        currency: fromCurrency,
        egp_amount: amounts.egpAmount,
        to_amount: amounts.toAmount ?? undefined,
        exchange_rate: amounts.exchangeRate ?? undefined,
        account_id: data.accountId,
        to_account_id: isTransferOrCC ? data.toAccountId : undefined,
        category_id: !isTransferOrCC ? data.categoryId : undefined,
        budget_id: semantics.usesBudget ? data.budgetId || undefined : undefined,
        note: data.note.trim() || undefined,
        transaction_date: data.date,
        transaction_time: submittedAt.time,
      });
      onClose();
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
    form.setValue('budgetId', '');
  }

  function toggleRateOverride() {
    const next = !rateOverride;
    setRateOverride(next);
    if (!next) form.setValue('exchangeRate', String(rate));
  }

  function selectAccount(account: Account) {
    clearError();
    const nextSemantics = resolveTransactionFormSemantics(type, account.type);
    if (nextSemantics.categoryType !== semantics.categoryType) {
      form.setValue('categoryId', '');
      form.setValue('budgetId', '');
      setAvailableBudgets([]);
      setBudgetId(undefined);
    }
    form.setValue('accountId', account.id);
    if (account.currency === Currency.USD) {
      form.setValue('exchangeRate', String(rate));
      setRateOverride(false);
    }
    setShowAccountPicker(false);
  }

  function selectToAccount(account: Account) {
    clearError();
    form.setValue('toAccountId', account.id);
    if (account.currency === Currency.USD && selectedAccount?.currency === Currency.EGP) {
      form.setValue('exchangeRate', String(rate));
      setRateOverride(false);
    }
    setShowToPicker(false);
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
      accountId,
      toAccountId,
      categoryId,
      budgetId: formBudgetId,
      date,
      note,
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
      accounts,
      hasAccounts: accounts.length > 0,
      accountsForFrom,
      accountsForTo,
      visibleCategories,
      showAccountPicker,
      showToPicker,
      showCategoryPicker,
      showBudgetPicker,
      closingPickers,
      budgetsLoading,
      availableBudgets,
      showBudgetField:
        semantics.usesBudget &&
        Boolean(categoryId) &&
        (budgetsLoading || Boolean(budgetLookupError) || availableBudgets.length > 0),
      rateUpdatedAt,
    },
    setType: (nextType: TransactionType) => {
      clearError();
      setType(nextType);
    },
    setAmountStr: (value: string) => {
      if (useAddTransactionState.getState().errorMessage) clearError();
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
    setShowAccountPicker,
    setShowToPicker,
    setShowCategoryPicker,
    setShowBudgetPicker,
    completePickerClose,
    selectAccount,
    selectToAccount,
    selectCategory,
    selectBudget,
    retryBudgetLookup,
    retryFormData: prerequisites?.retry ?? ignorePrerequisiteRetry,
    handleSave: () => {
      const amountStr = useAddTransactionStore.getState().amountStr;
      form.setValue('amount', parseDecimalText(amountStr) ?? Number.NaN);
      return form.handleSubmit(onValid)();
    },
  };
}
