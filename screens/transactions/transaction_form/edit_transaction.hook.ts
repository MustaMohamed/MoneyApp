import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

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
import { useEditTransactionState } from './edit_transaction.state';
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

function buildDefaults(tx: Transaction, rate: number): EditTransactionFormValues {
  return {
    amount: tx.amount,
    categoryId: tx.category_id ?? '',
    note: tx.note ?? '',
    date: tx.transaction_date,
    time: tx.transaction_time,
    exchangeRate: String(tx.exchange_rate ?? rate),
  };
}

export function useEditTransaction(initialTx: Transaction, onClose: () => void) {
  const { state: accountState, loadAccounts } = useAccountStore(
    useShallow((s) => ({ state: s.state, loadAccounts: s.loadAccounts })),
  );
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));
  const { state: currencyState } = useCurrencyStore(useShallow((s) => ({ state: s.state })));
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);

  const { state: editTxStoreState, handleNumpad } = useEditTransactionStore(
    useShallow((s) => ({ state: s.state, handleNumpad: s.handleNumpad })),
  );
  const {
    state: editTxState,
    setSaving,
    setShowCategoryPicker,
    setRateOverride,
  } = useEditTransactionState(
    useShallow((s) => ({
      state: s.state,
      setSaving: s.setSaving,
      setShowCategoryPicker: s.setShowCategoryPicker,
      setRateOverride: s.setRateOverride,
    })),
  );

  const type = initialTx.type;
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;

  const schema = useMemo(() => createEditSchema(type), [type]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildDefaults(initialTx, currencyState.rate),
  });

  const categoryId = form.watch('categoryId');
  const note = form.watch('note');
  const date = form.watch('date');
  const time = form.watch('time');
  const exchangeRate = form.watch('exchangeRate');

  // Locked account (cannot be changed during edit)
  const selectedAccount = useMemo(
    () => accountState.accounts.find((a) => a.id === initialTx.account_id) ?? null,
    [accountState.accounts, initialTx.account_id],
  );
  const selectedToAccount = useMemo(
    () =>
      initialTx.to_account_id
        ? (accountState.accounts.find((a) => a.id === initialTx.to_account_id) ?? null)
        : null,
    [accountState.accounts, initialTx.to_account_id],
  );

  const isUSD = selectedAccount?.currency === Currency.USD;
  const isToUSD = selectedToAccount?.currency === Currency.USD;
  const requiresRate = isUSD || (isTransferOrCC && isToUSD);

  const selectedCategory = useMemo(
    () => categoryState.categories.find((c) => c.id === categoryId) ?? null,
    [categoryState.categories, categoryId],
  );
  const visibleCategories = useMemo(
    () =>
      categoryState.categories.filter(
        (c) => c.type === (type === TransactionType.Income ? 'income' : 'expense'),
      ),
    [categoryState.categories, type],
  );

  const errors = {
    amount: form.formState.errors.amount?.message,
    category: form.formState.errors.categoryId?.message,
    rate: form.formState.errors.exchangeRate?.message,
  };

  // Sync numpad display string → RHF amount field
  useEffect(() => {
    const parsed = parseFloat(editTxStoreState.amountStr);
    form.setValue('amount', isNaN(parsed) ? 0 : parsed);
  }, [editTxStoreState.amountStr]);

  // When the sheet closes, reset the form and override flag to the original tx values
  useEffect(() => {
    if (!editTxState.visible) {
      form.reset(buildDefaults(initialTx, currencyState.rate));
      setRateOverride(initialTx.exchange_rate !== null);
    }
  }, [editTxState.visible]);

  async function onValid(data: EditTransactionFormValues) {
    setSaving(true);
    try {
      const fromCurrency = selectedAccount?.currency ?? Currency.EGP;
      const toCurrency = selectedToAccount?.currency;
      const parsedRate =
        data.exchangeRate && requiresRate ? parseFloat(data.exchangeRate) : undefined;

      const egp_amount =
        fromCurrency === Currency.USD && parsedRate ? data.amount * parsedRate : data.amount;

      let to_amount: number | undefined;
      if (isTransferOrCC && toCurrency !== undefined) {
        if (fromCurrency === Currency.EGP && toCurrency === Currency.USD && parsedRate) {
          to_amount = data.amount / parsedRate; // EGP → USD
        } else if (fromCurrency === Currency.USD && toCurrency === Currency.EGP) {
          to_amount = egp_amount; // USD → EGP
        } else {
          to_amount = data.amount; // same-currency
        }
        if (type === TransactionType.CCPayment) {
          to_amount = egp_amount; // CC debt is always EGP-denominated
        }
      }

      const updateInput: UpdateTransactionInput = {
        amount: data.amount,
        currency: fromCurrency,
        egp_amount,
        to_amount: to_amount ?? null,
        exchange_rate: parsedRate ?? null,
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

  function toggleRateOverride() {
    const next = !editTxState.rateOverride;
    setRateOverride(next);
    if (!next) {
      form.setValue('exchangeRate', String(currencyState.rate));
    }
  }

  function selectCategory(category: Category) {
    form.setValue('categoryId', category.id);
    setShowCategoryPicker(false);
  }

  return {
    state: {
      type,
      amountStr: editTxStoreState.amountStr,
      selectedAccount,
      selectedToAccount,
      categoryId,
      selectedCategory,
      date,
      time,
      note,
      exchangeRate,
      rateOverride: editTxState.rateOverride,
      isUSD: requiresRate,
      isTransferOrCC,
      errors,
      saving: editTxState.saving,
      visibleCategories,
      showCategoryPicker: editTxState.showCategoryPicker,
    },
    form,
    handleNumpad,
    setDate: (v: string) => form.setValue('date', v),
    setTime: (v: string) => form.setValue('time', v),
    setNote: (v: string) => form.setValue('note', v),
    setExchangeRate: (v: string) => form.setValue('exchangeRate', v),
    toggleRateOverride,
    setShowCategoryPicker,
    selectCategory,
    handleSave: form.handleSubmit(onValid),
  };
}
