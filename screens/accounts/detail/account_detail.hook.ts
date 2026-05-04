import { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';

import { AccountColors } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { useAccountDetailState } from './account_detail.state';

export function useAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const accounts = useAccountStore((s) => s.accounts);
  const updateAccount = useAccountStore((s) => s.updateAccount);
  const archiveAccount = useAccountStore((s) => s.archiveAccount);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);

  const detailState = useAccountDetailState((s) => s.state);
  const setEditing = useAccountDetailState((s) => s.setEditing);
  const setAdjustVisible = useAccountDetailState((s) => s.setAdjustVisible);
  const setArchiveVisible = useAccountDetailState((s) => s.setArchiveVisible);
  const setSaving = useAccountDetailState((s) => s.setSaving);
  const setAdjusting = useAccountDetailState((s) => s.setAdjusting);
  const setArchiving = useAccountDetailState((s) => s.setArchiving);
  const reset = useAccountDetailState((s) => s.reset);

  useEffect(() => () => reset(), []);

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
