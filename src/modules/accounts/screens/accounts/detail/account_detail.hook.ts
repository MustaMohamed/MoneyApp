import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import { useTransactionsScreenStore } from '@/modules/transactions/screens/transactions/transactions.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { runAfterInteractions } from '@/utils/run_after_interactions';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { currentYearMonth } from '@/utils/year_month';

import { DEFAULT_ACCOUNT_COLOR } from '../../../constants/account_palette';
import type { AccountActivityLoadInput } from '../../../repositories/account_activity.repository';
import { useAccountStore } from '../../../store/account.store';
import { useAccountActivityStore } from './account_activity.store';
import { useAccountDetailState } from './account_detail.state';
import { buildActivityRowPresentation } from './components/account_activity.helpers';
import { buildMonthFacts } from './components/account_facts.helpers';

// `navigate`, not `push`: pushing a route already in the `(app)` stack mounts a second tab navigator.
const TRANSACTIONS_TAB = '/(app)/(tabs)/transactions' as const;

export function useAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const accounts = useAccountStore((s) => s.accounts);
  const updateAccount = useAccountStore.getState().updateAccount;
  const archiveAccount = useAccountStore.getState().archiveAccount;
  const adjustBalance = useAccountStore.getState().adjustBalance;
  const confirmBalanceReviewed = useAccountStore.getState().confirmBalanceReviewed;
  const {
    isEditing,
    isAdjustVisible,
    isArchiveVisible,
    isSaving,
    isAdjusting,
    isArchiving,
    isConfirmingBalanceReview,
    balanceReviewError,
  } = useAccountDetailState(
    useShallow((s) => ({
      isEditing: s.isEditing,
      isAdjustVisible: s.isAdjustVisible,
      isArchiveVisible: s.isArchiveVisible,
      isSaving: s.isSaving,
      isAdjusting: s.isAdjusting,
      isArchiving: s.isArchiving,
      isConfirmingBalanceReview: s.isConfirmingBalanceReview,
      balanceReviewError: s.balanceReviewError,
    })),
  );
  const setEditing = useAccountDetailState.getState().setEditing;
  const setAdjustVisible = useAccountDetailState.getState().setAdjustVisible;
  const setArchiveVisible = useAccountDetailState.getState().setArchiveVisible;
  const setSaving = useAccountDetailState.getState().setSaving;
  const setAdjusting = useAccountDetailState.getState().setAdjusting;
  const setArchiving = useAccountDetailState.getState().setArchiving;
  const setConfirmingBalanceReview = useAccountDetailState.getState().setConfirmingBalanceReview;
  const setBalanceReviewError = useAccountDetailState.getState().setBalanceReviewError;
  const reset = useAccountDetailState.getState().reset;
  const { activityStatus, activitySnapshot } = useAccountActivityStore(
    useShallow((s) => ({ activityStatus: s.status, activitySnapshot: s.snapshot })),
  );
  const categories = useCategoryStore((s) => s.categories);

  useEffect(
    () => () => {
      reset();
      // Bumps the generation too, so a result racing an archive is dropped (M14).
      useAccountActivityStore.getState().reset();
    },
    [reset],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const currentState = useAccountDetailState.getState();
      if (!currentState.isEditing) return;
      e.preventDefault();
      currentState.setEditing(false);
    });
    return unsubscribe;
  }, [navigation]);

  const account = accounts.find((a) => a.id === id);

  const activityInput = useCallback(
    (): AccountActivityLoadInput => ({
      accountId: id,
      mutationVersion: useTransactionStore.getState().mutationVersion,
      now: new Date(),
    }),
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      const task = runAfterInteractions(
        () => {
          // Archive removes the account mid-flight; without this the load reads a dead id (M14).
          if (!useAccountStore.getState().accounts.some((a) => a.id === id)) return undefined;
          return useAccountActivityStore.getState().ensure(activityInput());
        },
        // The store owns the error status the card renders; this only leaves a trace.
        { onError: (error) => console.error('[accountDetail] activity load failed:', error) },
      );
      return () => task.cancel();
    }, [activityInput, id]),
  );

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const activityRows = useMemo(() => {
    if (activitySnapshot?.accountId !== id) return [];
    const loadedAt = new Date(activitySnapshot.loadedAt);
    return activitySnapshot.rows.map((tx) => {
      const category = tx.category_id ? categoriesById.get(tx.category_id) : undefined;
      return {
        id: tx.id,
        category,
        presentation: buildActivityRowPresentation(
          {
            tx,
            account: accountsById.get(tx.account_id),
            toAccount: tx.to_account_id ? accountsById.get(tx.to_account_id) : undefined,
            category,
          },
          loadedAt,
          id,
        ),
      };
    });
  }, [accountsById, activitySnapshot, categoriesById, id]);

  const monthFacts = useMemo(
    () =>
      account
        ? buildMonthFacts(
            account,
            activitySnapshot?.accountId === id ? activitySnapshot.stats : undefined,
          )
        : [],
    [account, activitySnapshot, id],
  );

  const editSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, Strings.errNameRequired)
          .max(30, Strings.errNameTooLong)
          .refine(
            (n) =>
              !accounts.some(
                (a) => a.id !== id && a.name.trim().toLowerCase() === n.trim().toLowerCase(),
              ),
            { message: Strings.errNameDuplicate },
          ),
        color: z.string(),
      }),
    [accounts, id],
  );

  const form = useZodForm(editSchema, {
    defaultValues: {
      name: account?.name ?? '',
      color: account?.color ?? DEFAULT_ACCOUNT_COLOR,
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({ name: account.name, color: account.color ?? DEFAULT_ACCOUNT_COLOR });
    }
  }, [account, form]);

  const handleSave = form.handleSubmit(async (data) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateAccount(id, { name: data.name.trim(), color: data.color });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  });

  const handleAdjustBalance = async (newBalance: number) => {
    if (!id) return;
    setAdjusting(true);
    try {
      await adjustBalance(id, newBalance);
      // After the await on purpose: a rejection keeps the sheet open with the typed value intact.
      setAdjustVisible(false);
    } finally {
      setAdjusting(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    setArchiving(true);
    try {
      await archiveAccount(id);
      setArchiveVisible(false);
      router.back();
    } finally {
      setArchiving(false);
    }
  };

  const handleConfirmBalanceReviewed = async () => {
    const detailState = useAccountDetailState.getState();
    if (!id || detailState.isConfirmingBalanceReview) return;
    detailState.setBalanceReviewError(undefined);
    detailState.setConfirmingBalanceReview(true);
    try {
      await confirmBalanceReviewed(id);
    } catch (error) {
      console.error('[accountDetail] confirmBalanceReviewed failed:', error);
      setBalanceReviewError(Strings.accountBalanceReviewError);
    } finally {
      setConfirmingBalanceReview(false);
    }
  };

  const onBack = () => {
    if (isEditing) {
      setEditing(false);
    } else {
      router.back();
    }
  };

  // Nothing to catch: a failed retry publishes `initialError`, which the card renders and logs.
  const retryActivity = () => {
    void useAccountActivityStore.getState().retry(activityInput());
  };

  const goToTransaction = (transactionId: string) => {
    router.navigate(`${TRANSACTIONS_TAB}/detail/${transactionId}`);
  };

  const goToAllTransactions = () => {
    useTransactionsScreenStore.getState().seedAccountFilter(id, currentYearMonth());
    router.navigate(TRANSACTIONS_TAB);
  };

  // Two frames past the pop: the tabs host is frozen until then, and a `Sheet` that first renders already-open never animates in.
  const addTransactionForAccount = () => {
    router.navigate(TRANSACTIONS_TAB);
    runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          useTransactionFormState.getState().openAdd({ accountId: id });
        });
      });
    });
  };

  return {
    state: {
      account,
      isEditing,
      isAdjustVisible,
      isArchiveVisible,
      isSaving,
      isAdjusting,
      isArchiving,
      isConfirmingBalanceReview,
      balanceReviewError,
      activity: { status: activityStatus, rows: activityRows, monthFacts },
    },
    form,
    setEditing,
    handleSave,
    setAdjustVisible,
    handleAdjustBalance,
    setArchiveVisible,
    handleArchive,
    handleConfirmBalanceReviewed,
    onBack,
    retryActivity,
    goToTransaction,
    goToAllTransactions,
    addTransactionForAccount,
  };
}
