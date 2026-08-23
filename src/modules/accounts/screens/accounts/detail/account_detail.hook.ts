import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { DEFAULT_ACCOUNT_COLOR } from '../../../constants/account_palette';
import { useAccountStore } from '../../../store/account.store';
import { useAccountDetailState } from './account_detail.state';

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
  useEffect(() => () => reset(), [reset]);

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
      // Deliberately after the await: a rejection skips it, so a failed adjust
      // leaves the sheet open with the value the user typed still in it. The
      // rejection itself propagates to `AdjustBalanceSheet.handleSave`, which
      // awaits this and renders the message — error copy belongs to the
      // component that owns the error channel (.claude/rules/state.md), and
      // this handler has exactly one caller, the sheet.
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
  };
}
