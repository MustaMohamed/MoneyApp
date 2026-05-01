import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { z } from 'zod';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useTransactionStore } from '@/store/transaction.store';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

function buildSchema(type: TransactionType) {
  const base = z.object({
    amountStr: z
      .string()
      .min(1, Strings.addTxErrAmountRequired)
      .refine((v) => parseFloat(v) > 0, Strings.addTxErrAmountZero),
    note: z.string().optional(),
    date: z.string().min(1),
    time: z.string().min(1),
    exchangeRate: z.string().optional(),
  });

  if (type === TransactionType.Transfer || type === TransactionType.CCPayment) {
    return base.extend({
      accountId: z.string().min(1, Strings.addTxErrFromRequired),
      toAccountId: z.string().min(1, Strings.addTxErrToRequired),
    });
  }
  return base.extend({
    accountId: z.string().min(1, Strings.addTxErrAccountRequired),
    categoryId: z.string().min(1, Strings.addTxErrCategoryRequired),
  });
}

export function useAddTransaction(onClose: () => void) {
  const router = useRouter();
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const currentRate = useCurrencyStore((s) => s.rate);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);

  const [type, setType] = useState<TransactionType>(TransactionType.Expense);
  const [amountStr, setAmountStr] = useState('0');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(() => new Date().toISOString().slice(11, 19));
  const [exchangeRate, setExchangeRate] = useState(() => String(currentRate));
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? null,
    [accounts, accountId],
  );

  const isUSD = selectedAccount?.currency === Currency.USD;

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories],
  );
  const visibleCategories = type === TransactionType.Income ? incomeCategories : expenseCategories;

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const selectedToAccount = useMemo(
    () => accounts.find((a) => a.id === toAccountId) ?? null,
    [accounts, toAccountId],
  );

  // Reset form when type changes
  useEffect(() => {
    setAmountStr('0');
    setAccountId('');
    setToAccountId('');
    setCategoryId('');
    setNote('');
    setErrors({});
  }, [type]);

  function handleNumpad(action: NumpadAction, value?: string) {
    setAmountStr((prev) => {
      if (action === 'backspace') {
        return prev.length <= 1 ? '0' : prev.slice(0, -1);
      }
      if (action === 'decimal') {
        if (prev.includes('.')) return prev;
        return prev + '.';
      }
      // digit
      const digit = value ?? '';
      if (prev === '0') return digit === '0' ? '0' : digit;
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1].length >= 2) return prev;
      }
      return prev + digit;
    });
  }

  function validate(): boolean {
    const errs: Partial<Record<string, string>> = {};

    if (!amountStr || parseFloat(amountStr) <= 0) {
      errs.amount =
        parseFloat(amountStr) === 0 ? Strings.addTxErrAmountZero : Strings.addTxErrAmountRequired;
    }

    if (type === TransactionType.Transfer || type === TransactionType.CCPayment) {
      if (!accountId) errs.account = Strings.addTxErrFromRequired;
      if (!toAccountId) errs.toAccount = Strings.addTxErrToRequired;
      if (accountId && toAccountId && accountId === toAccountId) {
        errs.toAccount = Strings.addTxErrSameAccount;
      }
    } else {
      if (!accountId) errs.account = Strings.addTxErrAccountRequired;
      if (!categoryId) errs.category = Strings.addTxErrCategoryRequired;
    }

    if (isUSD) {
      const rate = parseFloat(exchangeRate);
      if (!exchangeRate) errs.rate = Strings.addTxErrRateRequired;
      else if (isNaN(rate) || rate <= 0) errs.rate = Strings.addTxErrRateInvalid;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const amount = parseFloat(amountStr);
      const rate = isUSD ? parseFloat(exchangeRate) : undefined;
      const egp_amount = isUSD && rate ? amount * rate : amount;

      await addTransaction({
        type,
        amount,
        currency: selectedAccount?.currency ?? Currency.EGP,
        egp_amount,
        exchange_rate: rate,
        account_id: accountId,
        to_account_id:
          type === TransactionType.Transfer || type === TransactionType.CCPayment
            ? toAccountId
            : undefined,
        category_id:
          type === TransactionType.Expense || type === TransactionType.Income
            ? categoryId
            : undefined,
        note: note.trim() || undefined,
        transaction_date: date,
        transaction_time: time,
      });
      await loadAccounts();
      onClose();
    } catch {
      // error surfaced by store log
    } finally {
      setSaving(false);
    }
  }

  function selectAccount(account: Account) {
    setAccountId(account.id);
    if (account.currency === Currency.USD) {
      setExchangeRate(String(currentRate));
    }
    setShowAccountPicker(false);
  }

  function selectToAccount(account: Account) {
    setToAccountId(account.id);
    setShowToPicker(false);
  }

  function selectCategory(category: Category) {
    setCategoryId(category.id);
    setShowCategoryPicker(false);
  }

  return {
    type,
    setType,
    amountStr,
    handleNumpad,
    accountId,
    selectedAccount,
    toAccountId,
    selectedToAccount,
    categoryId,
    selectedCategory,
    note,
    setNote,
    date,
    setDate,
    time,
    setTime,
    exchangeRate,
    setExchangeRate,
    isUSD,
    errors,
    saving,
    accounts,
    visibleCategories,
    showAccountPicker,
    setShowAccountPicker,
    showToPicker,
    setShowToPicker,
    showCategoryPicker,
    setShowCategoryPicker,
    selectAccount,
    selectToAccount,
    selectCategory,
    handleSave,
    schema: buildSchema,
  };
}
