import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { CategoryType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Category } from '@/database/entities/category.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  useTransactionStore,
  type UpdateTransactionInput,
} from '@/modules/transactions/store/transaction.store';
import { roundMoney } from '@/utils/money';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { buildDefaultsFromTx, type EditTransactionFormValues } from './edit_transaction.helpers';
import { useEditTransactionState } from './edit_transaction.state';
import { useEditTransactionStore } from './edit_transaction.store';

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
  const amountStr = useEditTransactionStore.useState.amountStr();
  const setAmountStr = useEditTransactionStore.getState().setAmountStr;
  const handleNumpad = useEditTransactionStore.getState().handleNumpad;
  const { visible, saving, showCategoryPicker, rateOverride } = useEditTransactionState(
    useShallow((s) => ({
      visible: s.visible,
      saving: s.saving,
      showCategoryPicker: s.showCategoryPicker,
      rateOverride: s.rateOverride,
    })),
  );
  const setSaving = useEditTransactionState.getState().setSaving;
  const setShowCategoryPicker = useEditTransactionState.getState().setShowCategoryPicker;
  const setRateOverride = useEditTransactionState.getState().setRateOverride;

  const type = initialTx.type;
  const isTransferOrCC = type === TransactionType.Transfer || type === TransactionType.CCPayment;
  const schema = useMemo(() => createEditSchema(type), [type]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildDefaultsFromTx(initialTx, rate),
  });

  const categoryId = form.watch('categoryId');
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

  async function onValid(data: EditTransactionFormValues) {
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
      // error logged
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
      categoryId,
      note,
      date,
      exchangeRate,
      rateOverride,
      isUSD: requiresRate,
      isTransferOrCC,
      errors,
      saving,
      visibleCategories,
      showCategoryPicker,
      rateUpdatedAt,
    },
    setAmountStr,
    handleNumpad,
    setDate: (v: string) => form.setValue('date', v),
    setNote: (v: string) => form.setValue('note', v),
    setExchangeRate: (v: string) => form.setValue('exchangeRate', v),
    toggleRateOverride,
    setShowCategoryPicker,
    selectCategory,
    handleSave: form.handleSubmit(onValid),
  };
}
