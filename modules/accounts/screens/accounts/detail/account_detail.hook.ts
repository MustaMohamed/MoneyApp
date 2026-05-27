import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';

import { Strings } from '@/constants/strings';
import { AccountColors } from '@/constants/theme';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useAccountStore } from '../../../store/account.store';
import { useAccountDetailState } from './account_detail.state';

export function useAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const accounts = useAccountStore.useState.accounts();
  const updateAccount = useAccountStore.use.updateAccount();
  const archiveAccount = useAccountStore.use.archiveAccount();
  const adjustBalance = useAccountStore.use.adjustBalance();
  const isEditing = useAccountDetailState.useState.isEditing();
  const isAdjustVisible = useAccountDetailState.useState.isAdjustVisible();
  const isArchiveVisible = useAccountDetailState.useState.isArchiveVisible();
  const isSaving = useAccountDetailState.useState.isSaving();
  const isAdjusting = useAccountDetailState.useState.isAdjusting();
  const isArchiving = useAccountDetailState.useState.isArchiving();
  const setEditing = useAccountDetailState.use.setEditing();
  const setAdjustVisible = useAccountDetailState.use.setAdjustVisible();
  const setArchiveVisible = useAccountDetailState.use.setArchiveVisible();
  const setSaving = useAccountDetailState.use.setSaving();
  const setAdjusting = useAccountDetailState.use.setAdjusting();
  const setArchiving = useAccountDetailState.use.setArchiving();
  const reset = useAccountDetailState.use.reset();

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => reset(), []); // cleanup on unmount only; reset is a stable Zustand action

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!useAccountDetailState.getState().state.isEditing) return;
      e.preventDefault();
      useAccountDetailState.getState().setEditing(false);
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
    },
    form,
    setEditing,
    handleSave,
    setAdjustVisible,
    handleAdjustBalance,
    setArchiveVisible,
    handleArchive,
    onBack,
  };
}
