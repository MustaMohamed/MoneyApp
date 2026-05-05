import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useTransactionStore } from '@/store/transaction.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import { useAddTransactionState } from './add_transaction.state';
import { useAddTransactionStore } from './add_transaction.store';

export type AddTransactionFormValues = {
  amount: number;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  note: string;
  date: string;
  time: string;
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
      time: z.string().min(1),
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
        } else if (data.accountId && data.accountId === data.toAccountId) {
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
      const account = accounts.find((a) => a.id === data.accountId);
      const toAccount = accounts.find((a) => a.id === data.toAccountId);
      if (type === TransactionType.CCPayment) {
        if (account && account.type === AccountType.CreditCard) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrCcPaymentSourceMustBeAsset,
            path: ['accountId'],
          });
        }
        if (toAccount && toAccount.type !== AccountType.CreditCard) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrCcPaymentTargetMustBeCC,
            path: ['toAccountId'],
          });
        }
      }
      if (type === TransactionType.Transfer) {
        // Transfers move money between asset accounts. Anything involving a
        // credit card belongs in a CC Payment instead — keep the two flows
        // separate so the resulting transaction type accurately reflects the
        // operation (and so the CC revolving/installment math is correct).
        if (account && account.type === AccountType.CreditCard) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrTransferNoCc,
            path: ['accountId'],
          });
        }
        if (toAccount && toAccount.type === AccountType.CreditCard) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrTransferNoCc,
            path: ['toAccountId'],
          });
        }
      }
      // Rate is required when either account is USD (any conversion involves EGP↔USD).
      const needsRate =
        account?.currency === Currency.USD ||
        (isTransferOrCC && toAccount?.currency === Currency.USD);
      if (needsRate) {
        if (!data.exchangeRate) {
          ctx.addIssue({
            code: 'custom',
            message: Strings.addTxErrRateRequired,
            path: ['exchangeRate'],
          });
        } else {
          const rate = parseFloat(data.exchangeRate);
          if (isNaN(rate) || rate <= 0) {
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

function buildDefaults(rate: number): AddTransactionFormValues {
  const now = new Date().toISOString();
  return {
    amount: 0,
    accountId: '',
    toAccountId: '',
    categoryId: '',
    note: '',
    date: now.slice(0, 10),
    time: now.slice(11, 19),
    exchangeRate: String(rate),
  };
}

export function useAddTransaction(onClose: () => void) {
  const { state: accountState, loadAccounts } = useAccountStore(
    useShallow((s) => ({ state: s.state, loadAccounts: s.loadAccounts })),
  );
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));
  const { state: currencyState } = useCurrencyStore(useShallow((s) => ({ state: s.state })));
  const { addTransaction } = useTransactionStore(
    useShallow((s) => ({ addTransaction: s.addTransaction })),
  );

  const {
    state: addTxStoreState,
    setType,
    handleNumpad,
  } = useAddTransactionStore(
    useShallow((s) => ({ state: s.state, setType: s.setType, handleNumpad: s.handleNumpad })),
  );
  const {
    state: addTxState,
    setSaving,
    setShowAccountPicker,
    setShowToPicker,
    setShowCategoryPicker,
    setRateOverride,
  } = useAddTransactionState(
    useShallow((s) => ({
      state: s.state,
      setSaving: s.setSaving,
      setShowAccountPicker: s.setShowAccountPicker,
      setShowToPicker: s.setShowToPicker,
      setShowCategoryPicker: s.setShowCategoryPicker,
      setRateOverride: s.setRateOverride,
    })),
  );

  const schema = useMemo(
    () => createSchema(addTxStoreState.type, accountState.accounts),
    [addTxStoreState.type, accountState.accounts],
  );

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: buildDefaults(currencyState.rate),
  });

  const accountId = form.watch('accountId');
  const toAccountId = form.watch('toAccountId');
  const categoryId = form.watch('categoryId');
  const note = form.watch('note');
  const date = form.watch('date');
  const time = form.watch('time');
  const exchangeRate = form.watch('exchangeRate');

  const selectedAccount = useMemo(
    () => accountState.accounts.find((a) => a.id === accountId) ?? null,
    [accountState.accounts, accountId],
  );
  const isUSD = selectedAccount?.currency === Currency.USD;

  const selectedToAccount = useMemo(
    () => accountState.accounts.find((a) => a.id === toAccountId) ?? null,
    [accountState.accounts, toAccountId],
  );
  const selectedCategory = useMemo(
    () => categoryState.categories.find((c) => c.id === categoryId) ?? null,
    [categoryState.categories, categoryId],
  );
  const visibleCategories = useMemo(
    () =>
      categoryState.categories.filter(
        (c) => c.type === (addTxStoreState.type === TransactionType.Income ? 'income' : 'expense'),
      ),
    [categoryState.categories, addTxStoreState.type],
  );

  // Picker eligibility:
  //   CC payment: source = non-CC asset, target = CC.
  //   Transfer:   neither side may be a CC (CC moves go through cc_payment).
  //   Expense / Income: any account.
  const accountsForFrom = useMemo(() => {
    if (
      addTxStoreState.type === TransactionType.CCPayment ||
      addTxStoreState.type === TransactionType.Transfer
    ) {
      return accountState.accounts.filter((a) => a.type !== AccountType.CreditCard);
    }
    return accountState.accounts;
  }, [accountState.accounts, addTxStoreState.type]);
  const accountsForTo = useMemo(() => {
    if (addTxStoreState.type === TransactionType.CCPayment) {
      return accountState.accounts.filter((a) => a.type === AccountType.CreditCard);
    }
    if (addTxStoreState.type === TransactionType.Transfer) {
      return accountState.accounts.filter((a) => a.type !== AccountType.CreditCard);
    }
    return accountState.accounts;
  }, [accountState.accounts, addTxStoreState.type]);

  const errors = {
    amount: form.formState.errors.amount?.message,
    account: form.formState.errors.accountId?.message,
    toAccount: form.formState.errors.toAccountId?.message,
    category: form.formState.errors.categoryId?.message,
    rate: form.formState.errors.exchangeRate?.message,
  };

  // Sync numpad display string → RHF amount field
  useEffect(() => {
    const parsed = parseFloat(addTxStoreState.amountStr);
    form.setValue('amount', isNaN(parsed) ? 0 : parsed);
  }, [addTxStoreState.amountStr]);

  // Clear only the type-dependent fields when type changes; preserve note/date/time/exchangeRate.
  // (store already resets amountStr in setType)
  useEffect(() => {
    form.setValue('toAccountId', '');
    form.setValue('categoryId', '');
  }, [addTxStoreState.type]);

  // When the sheet closes, reset the form and override flag so the next open starts clean.
  useEffect(() => {
    if (!addTxState.visible) {
      form.reset(buildDefaults(currencyState.rate));
      setRateOverride(false);
    }
  }, [addTxState.visible]);

  const isTransferOrCC =
    addTxStoreState.type === TransactionType.Transfer ||
    addTxStoreState.type === TransactionType.CCPayment;
  const isToUSD = selectedToAccount?.currency === Currency.USD;
  const requiresRate = isUSD || (isTransferOrCC && isToUSD);

  async function onValid(data: AddTransactionFormValues) {
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
          to_amount = egp_amount; // USD → EGP (EGP received = egp_amount)
        } else {
          to_amount = data.amount; // same-currency (EGP→EGP or USD→USD)
        }
        if (addTxStoreState.type === TransactionType.CCPayment) {
          to_amount = egp_amount; // CC debt is always EGP-denominated
        }
      }

      await addTransaction({
        type: addTxStoreState.type,
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
        transaction_time: data.time,
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
    const next = !addTxState.rateOverride;
    setRateOverride(next);
    if (!next) {
      form.setValue('exchangeRate', String(currencyState.rate));
    }
  }

  function selectAccount(account: Account) {
    form.setValue('accountId', account.id);
    if (account.currency === Currency.USD) {
      form.setValue('exchangeRate', String(currencyState.rate));
      setRateOverride(false);
    }
    setShowAccountPicker(false);
  }

  function selectToAccount(account: Account) {
    form.setValue('toAccountId', account.id);
    if (account.currency === Currency.USD && selectedAccount?.currency === Currency.EGP) {
      form.setValue('exchangeRate', String(currencyState.rate));
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
      type: addTxStoreState.type,
      amountStr: addTxStoreState.amountStr,
      accountId,
      selectedAccount,
      toAccountId,
      selectedToAccount,
      categoryId,
      selectedCategory,
      date,
      time,
      note,
      exchangeRate,
      rateOverride: addTxState.rateOverride,
      isUSD: requiresRate,
      isTransferOrCC,
      errors,
      saving: addTxState.saving,
      accounts: accountState.accounts,
      accountsForFrom,
      accountsForTo,
      visibleCategories,
      showAccountPicker: addTxState.showAccountPicker,
      showToPicker: addTxState.showToPicker,
      showCategoryPicker: addTxState.showCategoryPicker,
    },
    form,
    setType,
    handleNumpad,
    setDate: (v: string) => form.setValue('date', v),
    setTime: (v: string) => form.setValue('time', v),
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
