import { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { AccountColors } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { useAccountDetailState } from './account_detail.state';

export function useAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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

  useEffect(() => () => reset(), []);

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

  const onBack = () => router.back();

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
