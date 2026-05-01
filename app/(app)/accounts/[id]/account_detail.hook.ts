import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';

import { AccountColors } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { useAccountDetailStore } from './account_detail.store';

export function useAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const accounts = useAccountStore((s) => s.accounts);
  const updateAccount = useAccountStore((s) => s.updateAccount);
  const archiveAccount = useAccountStore((s) => s.archiveAccount);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);

  const isEditing = useAccountDetailStore((s) => s.isEditing);
  const setEditing = useAccountDetailStore((s) => s.setEditing);
  const isAdjustVisible = useAccountDetailStore((s) => s.isAdjustVisible);
  const setAdjustVisible = useAccountDetailStore((s) => s.setAdjustVisible);
  const isArchiveVisible = useAccountDetailStore((s) => s.isArchiveVisible);
  const setArchiveVisible = useAccountDetailStore((s) => s.setArchiveVisible);
  const reset = useAccountDetailStore((s) => s.reset);

  const [isSaving, setIsSaving] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

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
  }, [account]);

  const handleSave = form.handleSubmit(async (data) => {
    if (!id) return;
    setIsSaving(true);
    try {
      await updateAccount(id, { name: data.name.trim(), color: data.color });
      setEditing(false);
    } finally {
      setIsSaving(false);
    }
  });

  const handleAdjustBalance = async (newBalance: number) => {
    if (!id) return;
    setIsAdjusting(true);
    try {
      await adjustBalance(id, newBalance);
      setAdjustVisible(false);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    setIsArchiving(true);
    try {
      await archiveAccount(id);
      setArchiveVisible(false);
      router.back();
    } finally {
      setIsArchiving(false);
    }
  };

  const onBack = () => router.back();

  return {
    account,
    form,
    isEditing,
    setEditing,
    handleSave,
    isSaving,
    isAdjustVisible,
    setAdjustVisible,
    handleAdjustBalance,
    isAdjusting,
    isArchiveVisible,
    setArchiveVisible,
    handleArchive,
    isArchiving,
    onBack,
  };
}
