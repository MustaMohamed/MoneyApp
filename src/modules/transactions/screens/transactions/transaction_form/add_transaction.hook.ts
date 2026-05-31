import { useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { AccountType, CategoryType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { EMPTY_ACCOUNTS, useAccounts } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { roundMoney } from '@/utils/money';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useAddTransactionState } from './add_transaction.state';
import { useAddTransactionStore } from './add_transaction.store';

export type AddTransactionFormValues = {
  amount: number;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  note: string;
  date: string;
  exchangeRate: string;
};

function createSchema(type: TransactionType, accounts: Account[]) {
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  return z
    .object({
      amount: z
        .number({ error: Strings.addTxErrAmountRequired })
        .refine((v) => v > 0, Strings.addTxErrAmountZero),
      accountId: z
        .string()
        .min(1, isTransferOrCC ? Strings.addTxErrFromRequired : Strings.addTxErrAccountRequired),
      toAccountId: z.string(),
      categoryId: z.string(),
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
      }

      const acc = accounts.find((a) => a.id === data.accountId);
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

      const needsRate =
        acc?.currency === Currency.USD || (isTransferOrCC && toAcc?.currency === Currency.USD);
      if (needsRate) {
        if (!data.exchangeRate) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrRateRequired,
            path: ['exchangeRate'],
          });
        } else {
          const r = parseFloat(data.exchangeRate);
          if (isNaN(r) || r <= 0) {
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

function nowDateISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeISO(): string {
  return new Date().toTimeString().slice(0, 8);
}

export function useAddTransaction(onClose: () => void) {
  const { state: accountsState, loadAccounts } = useAccounts();
  const accounts = accountsState.accounts.value ?? EMPTY_ACCOUNTS;
  const categories = useCategoryStore.useState.categories();
  const { rate, rateUpdatedAt } = useCurrencyStore(
    useShallow((s) => ({
      rate: s.rate,
      rateUpdatedAt: s.rate_updated_at,
    })),
  );
  const addTransaction = useTransactionStore.getState().addTransaction;
  const { type, amountStr } = useAddTransactionStore(
    useShallow((s) => ({
      type: s.type,
      amountStr: s.amountStr,
    })),
  );
  const setType = useAddTransactionStore.getState().setType;
  const setAmountStr = useAddTransactionStore.getState().setAmountStr;
  const handleNumpad = useAddTransactionStore.getState().handleNumpad;
  const { visible, saving, showAccountPicker, showToPicker, showCategoryPicker, rateOverride } =
    useAddTransactionState(
      useShallow((s) => ({
        visible: s.visible,
        saving: s.saving,
        showAccountPicker: s.showAccountPicker,
        showToPicker: s.showToPicker,
        showCategoryPicker: s.showCategoryPicker,
        rateOverride: s.rateOverride,
      })),
    );
  const setSaving = useAddTransactionState.getState().setSaving;
  const setShowAccountPicker = useAddTransactionState.getState().setShowAccountPicker;
  const setShowToPicker = useAddTransactionState.getState().setShowToPicker;
  const setShowCategoryPicker = useAddTransactionState.getState().setShowCategoryPicker;
  const setRateOverride = useAddTransactionState.getState().setRateOverride;

  // Freeze the form-open timestamp once per sheet open so saving later doesn't drift the time.
  const openedTimeRef = useRef<string>(nowTimeISO());
  useEffect(() => {
    if (visible) openedTimeRef.current = nowTimeISO();
  }, [visible]);

  const schema = useMemo(() => createSchema(type, accounts), [type, accounts]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      amount: 0,
      accountId: '',
      toAccountId: '',
      categoryId: '',
      note: '',
      date: nowDateISO(),
      exchangeRate: String(rate),
    },
  });

  const accountId = form.watch('accountId');
  const toAccountId = form.watch('toAccountId');
  const categoryId = form.watch('categoryId');
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

  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const isUSD = selectedAccount?.currency === Currency.USD;
  const isToUSD = selectedToAccount?.currency === Currency.USD;
  const requiresRate = isUSD || (isTransferOrCC && isToUSD);

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.type === (type === TransactionType.Income ? CategoryType.Income : CategoryType.Expense),
      ),
    [categories, type],
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
    rate: form.formState.errors.exchangeRate?.message,
  };

  // Sync numpad → RHF amount
  useEffect(() => {
    const parsed = parseFloat(amountStr);
    form.setValue('amount', isNaN(parsed) ? 0 : parsed);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [amountStr]);

  // Clear type-dependent fields when type changes
  useEffect(() => {
    form.setValue('toAccountId', '');
    form.setValue('categoryId', '');
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Reset form when sheet closes
  useEffect(() => {
    if (!visible) {
      form.reset({
        amount: 0,
        accountId: '',
        toAccountId: '',
        categoryId: '',
        note: '',
        date: nowDateISO(),
        exchangeRate: String(rate),
      });
      setRateOverride(false);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function onValid(data: AddTransactionFormValues) {
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
        if (type === TransactionType.CCPayment) {
          to_amount = egp_amount;
        }
      }

      await addTransaction({
        type,
        amount: data.amount,
        currency: fromCurrency,
        egp_amount,
        to_amount,
        exchange_rate: parsedRate,
        account_id: data.accountId,
        to_account_id: isTransferOrCC ? data.toAccountId : undefined,
        category_id: !isTransferOrCC ? data.categoryId : undefined,
        note: data.note.trim() || undefined,
        transaction_date: data.date,
        transaction_time: openedTimeRef.current,
      });
      await loadAccounts();
      onClose();
    } catch {
      // error logged by store
    } finally {
      setSaving(false);
    }
  }

  function toggleRateOverride() {
    const next = !rateOverride;
    setRateOverride(next);
    if (!next) form.setValue('exchangeRate', String(rate));
  }

  function selectAccount(account: Account) {
    form.setValue('accountId', account.id);
    if (account.currency === Currency.USD) {
      form.setValue('exchangeRate', String(rate));
      setRateOverride(false);
    }
    setShowAccountPicker(false);
  }

  function selectToAccount(account: Account) {
    form.setValue('toAccountId', account.id);
    if (account.currency === Currency.USD && selectedAccount?.currency === Currency.EGP) {
      form.setValue('exchangeRate', String(rate));
      setRateOverride(false);
    }
    setShowToPicker(false);
  }

  function selectCategory(category: Category) {
    form.setValue('categoryId', category.id);
    setShowCategoryPicker(false);
  }

  return {
    state: {
      type,
      amountStr,
      selectedAccount,
      selectedToAccount,
      selectedCategory,
      accountId,
      toAccountId,
      categoryId,
      date,
      note,
      exchangeRate,
      rateOverride,
      isUSD: requiresRate,
      isTransferOrCC,
      errors,
      saving,
      accounts,
      hasAccounts: accounts.length > 0,
      accountsForFrom,
      accountsForTo,
      visibleCategories,
      showAccountPicker,
      showToPicker,
      showCategoryPicker,
      rateUpdatedAt,
    },
    setType,
    setAmountStr,
    handleNumpad,
    setDate: (v: string) => form.setValue('date', v),
    setNote: (v: string) => form.setValue('note', v),
    setExchangeRate: (v: string) => form.setValue('exchangeRate', v),
    toggleRateOverride,
    setShowAccountPicker,
    setShowToPicker,
    setShowCategoryPicker,
    selectAccount,
    selectToAccount,
    selectCategory,
    handleSave: form.handleSubmit(onValid),
  };
}
