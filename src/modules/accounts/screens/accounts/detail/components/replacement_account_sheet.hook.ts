import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useToast } from '@/components/ui/toast';
import { Strings } from '@/constants/strings';
import type { AccountCommitmentRef } from '@/modules/commitments/database/commitments';
import { resolveAccountName } from '@/utils/account_name';

import { useAccountStore, type Account } from '../../../../store/account.store';
import { resolveMovedToast } from './replacement_account_sheet.helpers';
import { useReplacementAccountSheetState } from './replacement_account_sheet.state';

interface ReplacementAccountSheetInput {
  account: Account;
  commitments: Readonly<AccountCommitmentRef[]>;
  options: Account[];
}

export function useReplacementAccountSheet({
  account,
  commitments,
  options,
}: ReplacementAccountSheetInput) {
  const router = useRouter();
  const { toast } = useToast();
  const deleteAccountMovingCommitments = useAccountStore.getState().deleteAccountMovingCommitments;
  const { isVisible, replacementAccountId, isMovingAndDeleting, moveAndDeleteError } =
    useReplacementAccountSheetState(
      useShallow((s) => ({
        isVisible: s.isVisible,
        replacementAccountId: s.replacementAccountId,
        isMovingAndDeleting: s.isMovingAndDeleting,
        moveAndDeleteError: s.moveAndDeleteError,
      })),
    );
  const setVisible = useReplacementAccountSheetState.getState().setVisible;
  const setReplacementAccountId =
    useReplacementAccountSheetState.getState().setReplacementAccountId;
  const setMovingAndDeleting = useReplacementAccountSheetState.getState().setMovingAndDeleting;
  const setMoveAndDeleteError = useReplacementAccountSheetState.getState().setMoveAndDeleteError;

  // HeroUI closes the idle sheet on hardware back; only the busy window must keep the press from the screen.
  useEffect(() => {
    if (!isMovingAndDeleting) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [isMovingAndDeleting]);

  const selectReplacement = (replacementId: string) => {
    if (useReplacementAccountSheetState.getState().isMovingAndDeleting) return;
    setReplacementAccountId(replacementId);
  };

  const closeReplacement = () => {
    if (useReplacementAccountSheetState.getState().isMovingAndDeleting) return;
    setVisible(false);
    setMoveAndDeleteError(undefined);
  };

  const handleMoveAndDelete = async () => {
    const sheetState = useReplacementAccountSheetState.getState();
    if (sheetState.isMovingAndDeleting) return;
    const replacement = options.find((a) => a.id === sheetState.replacementAccountId);
    if (!replacement) return;
    // Read before the write, which scrubs the name and reloads both lists.
    const name = resolveAccountName(account);
    const replacementName = resolveAccountName(replacement);
    setMoveAndDeleteError(undefined);
    setMovingAndDeleting(true);
    try {
      await deleteAccountMovingCommitments(account.id, replacement.id);
    } catch (error) {
      console.error('[accountDetail] deleteAccountMovingCommitments failed:', error);
      setMoveAndDeleteError(Strings.accountDetailDeleteError);
      return;
    } finally {
      setMovingAndDeleting(false);
    }
    // Outside the try, and the pop before the toast so it lands on the screen the detail came from.
    setVisible(false);
    router.back();
    toast.show({
      label: resolveMovedToast({ accountName: name, commitments, replacementName }),
      variant: 'success',
    });
  };

  return {
    state: {
      isOpen: isVisible,
      selectedId: replacementAccountId,
      busy: isMovingAndDeleting,
      errorMessage: moveAndDeleteError,
    },
    selectReplacement,
    closeReplacement,
    handleMoveAndDelete,
  };
}
