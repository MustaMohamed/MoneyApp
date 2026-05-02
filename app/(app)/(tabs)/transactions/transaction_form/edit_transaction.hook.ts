import { useEffect, useMemo } from 'react';
import { z } from 'zod';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useTransactionStore, type UpdateTransactionInput } from '@/store/transaction.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { useEditTransactionStore } from './edit_transaction.store';

export type EditTransactionFormValues = {
  amount: number;
  categoryId: string;
  note: string;
  date: string;
  time: string;
  exchangeRate: string;
};

function createEditSchema(type: TransactionType) {
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  return z.object({
    amount: z
      .number({ error: Strings.addTxErrAmountRequired })
      .refine((v) => v > 0, Strings.addTxErrAmountZero),
    categoryId: isTransferOrCC ? z.string() : z.string().min(1, Strings.addTxErrCategoryRequired),
    note: z.string(),
    date: z.string().min(1),
    time: z.string().min(1),
    exchangeRate: z.string(),
  });
}

function buildDefaults(tx: Transaction, currentRate: number): EditTransactionFormValues {
  return {
    amount: tx.amount,
    categoryId: tx.category_id ?? '',
    note: tx.note ?? '',
    date: tx.transaction_date,
    time: tx.transaction_time,
    exchangeRate: String(tx.exchange_rate ?? currentRate),
  };
}

export function useEditTransaction(initialTx: Transaction, onClose: () => void) {
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const currentRate = useCurrencyStore((s) => s.rate);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);

  const {
    amountStr,
    visible,
    saving,
    setSaving,
    showCategoryPicker,
    setShowCategoryPicker,
    handleNumpad,
  } = useEditTransactionStore();

  const type = initialTx.type;
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  const schema = useMemo(() => createEditSchema(type), [type]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildDefaults(initialTx, currentRate),
  });

  const categoryId = form.watch('categoryId');
  const note = form.watch('note');
  const exchangeRate = form.watch('exchangeRate');

  // Locked account (cannot be changed during edit)
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

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const visibleCategories = useMemo(
    () =>
      categories.filter((c) => c.type === (type === TransactionType.Income ? 'income' : 'expense')),
    [categories, type],
  );

  const errors = {
    amount: form.formState.errors.amount?.message,
    category: form.formState.errors.categoryId?.message,
    rate: form.formState.errors.exchangeRate?.message,
  };

  // Sync numpad display string → RHF amount field
  useEffect(() => {
    const parsed = parseFloat(amountStr);
    form.setValue('amount', isNaN(parsed) ? 0 : parsed);
  }, [amountStr]);

  // When the sheet closes, reset the form to the original tx values
  useEffect(() => {
    if (!visible) {
      form.reset(buildDefaults(initialTx, currentRate));
    }
  }, [visible]);

  async function onValid(data: EditTransactionFormValues) {
    setSaving(true);
    try {
      const rate = isUSD && data.exchangeRate ? parseFloat(data.exchangeRate) : undefined;
      const egp_amount = isUSD && rate ? data.amount * rate : data.amount;

      const updateInput: UpdateTransactionInput = {
        amount: data.amount,
        currency: selectedAccount?.currency ?? Currency.EGP,
        egp_amount,
        exchange_rate: rate ?? null,
        category_id: !isTransferOrCC ? data.categoryId : null,
        note: data.note.trim() || null,
        transaction_date: data.date,
        transaction_time: data.time,
      };

      await updateTransaction(initialTx.id, updateInput);
      await loadAccounts();
      onClose();
    } catch {
      // error logged by store
    } finally {
      setSaving(false);
    }
  }

  function selectCategory(category: Category) {
    form.setValue('categoryId', category.id);
    setShowCategoryPicker(false);
  }

  return {
    form,
    type,
    amountStr,
    handleNumpad,
    selectedAccount,
    selectedToAccount,
    categoryId,
    selectedCategory,
    note,
    setNote: (v: string) => form.setValue('note', v),
    exchangeRate,
    setExchangeRate: (v: string) => form.setValue('exchangeRate', v),
    isUSD,
    isTransferOrCC,
    errors,
    saving,
    visibleCategories,
    showCategoryPicker,
    setShowCategoryPicker,
    selectCategory,
    handleSave: form.handleSubmit(onValid),
  };
}
