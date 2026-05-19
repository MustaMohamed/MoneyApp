import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { AccountColors } from '@/constants/theme';
import { useAccountStore } from '@/store/account.store';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useAccountDetailState } from './account_detail.state';

export function useAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const {
    state: accountState,
    updateAccount,
    archiveAccount,
    adjustBalance,
  } = useAccountStore(
    useShallow((s) => ({
      state: s.state,
      updateAccount: s.updateAccount,
      archiveAccount: s.archiveAccount,
      adjustBalance: s.adjustBalance,
    })),
  );
  const {
    state: detailState,
    setEditing,
    setAdjustVisible,
    setArchiveVisible,
    setSaving,
    setAdjusting,
    setArchiving,
    reset,
  } = useAccountDetailState(
    useShallow((s) => ({
      state: s.state,
      setEditing: s.setEditing,
      setAdjustVisible: s.setAdjustVisible,
      setArchiveVisible: s.setArchiveVisible,
      setSaving: s.setSaving,
      setAdjusting: s.setAdjusting,
      setArchiving: s.setArchiving,
      reset: s.reset,
    })),
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => reset(), []); // cleanup on unmount only; reset is a stable Zustand action

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!useAccountDetailState.getState().state.isEditing) return;
      e.preventDefault();
      useAccountDetailState.getState().setEditing(false);
    });
    return unsubscribe;
  }, [navigation]);

  const account = accountState.accounts.find((a) => a.id === id);

  const editSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, Strings.errNameRequired)
          .max(30, Strings.errNameTooLong)
          .refine(
            (n) =>
              !accountState.accounts.some(
                (a) => a.id !== id && a.name.trim().toLowerCase() === n.trim().toLowerCase(),
              ),
            { message: Strings.errNameDuplicate },
          ),
        color: z.string(),
      }),
    [accountState.accounts, id],
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
    if (detailState.isEditing) {
      setEditing(false);
    } else {
      router.back();
    }
  };

  return {
    state: {
      account,
      isEditing: detailState.isEditing,
      isAdjustVisible: detailState.isAdjustVisible,
      isArchiveVisible: detailState.isArchiveVisible,
      isSaving: detailState.isSaving,
      isAdjusting: detailState.isAdjusting,
      isArchiving: detailState.isArchiving,
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
