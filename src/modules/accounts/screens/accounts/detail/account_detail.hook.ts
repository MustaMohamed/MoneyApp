import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { AccountColors } from '@/constants/theme';
import { useZodForm } from '@/utils/use_zod_form.hook';

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
  } = useAccountDetailState(
    useShallow((s) => ({
      isEditing: s.isEditing,
      isAdjustVisible: s.isAdjustVisible,
      isArchiveVisible: s.isArchiveVisible,
      isSaving: s.isSaving,
      isAdjusting: s.isAdjusting,
      isArchiving: s.isArchiving,
      isConfirmingBalanceReview: s.isConfirmingBalanceReview,
    })),
  );
  const setEditing = useAccountDetailState.getState().setEditing;
  const setAdjustVisible = useAccountDetailState.getState().setAdjustVisible;
  const setArchiveVisible = useAccountDetailState.getState().setArchiveVisible;
  const setSaving = useAccountDetailState.getState().setSaving;
  const setAdjusting = useAccountDetailState.getState().setAdjusting;
  const setArchiving = useAccountDetailState.getState().setArchiving;
  const setConfirmingBalanceReview = useAccountDetailState.getState().setConfirmingBalanceReview;
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
      color: account?.color ?? AccountColors[0],
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({ name: account.name, color: account.color ?? AccountColors[0] });
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
    if (!id || isConfirmingBalanceReview) return;
    setConfirmingBalanceReview(true);
    try {
      await confirmBalanceReviewed(id);
    } catch (error) {
      console.error('[accountDetail] confirmBalanceReviewed failed:', error);
      Alert.alert(Strings.accountBalanceReviewError);
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
