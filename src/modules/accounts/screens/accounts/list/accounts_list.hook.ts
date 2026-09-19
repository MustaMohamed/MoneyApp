import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useToast } from '@/components/ui/toast';
import { Strings } from '@/constants/strings';
import { useBaseCurrencyStore } from '@/modules/currency/store/base_currency.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useDashboardStore } from '@/modules/dashboard/screens/dashboard/dashboard.store';
import { resolveAccountName } from '@/utils/account_name';

import { isRateUsable } from '../../../domain/account_aggregation';
import { AccountNameTakenError } from '../../../repositories/account.errors';
import { useAccountStore } from '../../../store/account.store';
import { resolveAccountCaption, resolveAccountsListContent } from './accounts_list.helpers';
import {
  isAccountsListReorderable,
  matchesAccountsListType,
  resolveAccountsListEmptyState,
  resolveAccountsListSectionTitle,
  resolveArchivedCardType,
} from './accounts_list.presentation';
import {
  applyPendingOrder,
  type ReorderDirection,
  resolveMoveTarget,
  resolveReorderedIds,
} from './accounts_list.reorder';
import { useAccountsListState } from './accounts_list.state';
import {
  resolveArchivedCardRows,
  resolveArchivedSummary,
} from './components/archived_card.helpers';

/** No focus loader: the store reloads at startup and after every mutation, and Try again is the only reload this screen starts; no focus effect for the archived card either. */
export function useAccountsList() {
  const router = useRouter();
  const { accounts, archivedAccounts, archivedCount, loadError } = useAccountStore(
    useShallow((s) => ({
      accounts: s.accounts,
      archivedAccounts: s.archivedAccounts,
      archivedCount: s.archivedCount,
      loadError: s.loadError,
    })),
  );
  const loadAccounts = useAccountStore.getState().loadAccounts;
  const unarchiveAccount = useAccountStore.getState().unarchiveAccount;
  const reorderAccounts = useAccountStore.getState().reorderAccounts;
  const isRetrying = useAccountsListState((s) => s.isRetrying);
  const setRetrying = useAccountsListState.getState().setRetrying;
  const selectedType = useAccountsListState((s) => s.selectedType);
  const setSelectedType = useAccountsListState.getState().setSelectedType;
  const isArchivedExpanded = useAccountsListState((s) => s.isArchivedExpanded);
  const unarchivingId = useAccountsListState((s) => s.unarchivingId);
  const unarchiveError = useAccountsListState((s) => s.unarchiveError);
  const setArchivedExpanded = useAccountsListState.getState().setArchivedExpanded;
  const setUnarchivingId = useAccountsListState.getState().setUnarchivingId;
  const setUnarchiveError = useAccountsListState.getState().setUnarchiveError;
  const resetArchivedCard = useAccountsListState.getState().resetArchivedCard;
  const pendingOrder = useAccountsListState((s) => s.pendingOrder);
  const setPendingOrder = useAccountsListState.getState().setPendingOrder;
  const setReordering = useAccountsListState.getState().setReordering;
  const isReordering = useAccountsListState((s) => s.isReordering);
  const liftedId = useAccountsListState((s) => s.liftedId);
  const liftGeneration = useAccountsListState((s) => s.liftGeneration);
  const setLiftedId = useAccountsListState.getState().setLiftedId;
  const { toast } = useToast();
  const { rate, isManualOverride, rateUpdatedAt } = useCurrencyStore(
    useShallow((state) => ({
      rate: state.rate,
      // `INITIAL_STATE.rate` is 50, so provenance needs both fields, not the rate alone.
      isManualOverride: state.isManualOverride,
      rateUpdatedAt: state.rate_updated_at,
    })),
  );
  const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency);
  // The dashboard's own snapshot, refreshed on its focus; no snapshot means zero figures.
  const statsMap = useDashboardStore((s) => s.snapshot?.statsMap);

  // The unmount reset is what paints the next mount collapsed from its first frame.
  useEffect(() => {
    resetArchivedCard();
    return resetArchivedCard;
  }, [resetArchivedCard]);

  useEffect(() => () => setLiftedId(undefined), [setLiftedId]);

  // Decided once here and passed down; never re-derived as `rate > 0` when displaying.
  const rateUsable = isRateUsable({ rate, rateUpdatedAt, isManualOverride });

  const allRows = useMemo(
    () =>
      accounts.map((account) => ({
        account,
        caption: resolveAccountCaption({
          account,
          rate,
          stats: statsMap?.[account.id],
          isRateUsable: rateUsable,
          baseCurrency,
        }),
      })),
    [accounts, baseCurrency, rate, rateUsable, statsMap],
  );

  // A narrow or a pending order over the same row objects: neither re-derives a caption (ADR 2026-09-07).
  const rows = useMemo(
    () =>
      selectedType === 'all'
        ? applyPendingOrder(allRows, pendingOrder, (row) => row.account.id)
        : allRows.filter((row) => matchesAccountsListType(row.account.type, selectedType)),
    [allRows, pendingOrder, selectedType],
  );
  const isReorderable = isAccountsListReorderable(selectedType);
  const liftedRow = useMemo(
    () => (liftedId === undefined ? undefined : rows.find((row) => row.account.id === liftedId)),
    [liftedId, rows],
  );

  const emptyState = resolveAccountsListEmptyState({
    activeCount: accounts.length,
    archivedCount,
    visibleCount: rows.length,
  });
  const archivedCardType = resolveArchivedCardType({ emptyState, selectedType });
  const archivedRows = useMemo(
    () => resolveArchivedCardRows(archivedAccounts, archivedCardType),
    [archivedAccounts, archivedCardType],
  );

  const goToAccount = useCallback(
    (id: string) => {
      if (useAccountsListState.getState().liftedId !== undefined) return;
      router.push(`/accounts/${id}`);
    },
    [router],
  );
  const goToAddAccount = useCallback(() => router.push('/accounts/add_account'), [router]);
  const onBack = useCallback(() => router.back(), [router]);

  const retry = useCallback(async () => {
    if (useAccountsListState.getState().isRetrying) return;
    setRetrying(true);
    try {
      await loadAccounts();
    } catch {
      // The account store owns the retryable error state.
    } finally {
      setRetrying(false);
    }
  }, [loadAccounts, setRetrying]);

  const unarchive = useCallback(
    async (id: string) => {
      if (useAccountsListState.getState().unarchivingId !== undefined) return;
      const account = useAccountStore
        .getState()
        .archivedAccounts.find((archived) => archived.id === id);
      if (account === undefined) return;
      const name = resolveAccountName(account);

      setUnarchiveError(undefined);
      setUnarchivingId(id);
      try {
        await unarchiveAccount(id);
      } catch (error) {
        setUnarchiveError({
          id,
          message:
            error instanceof AccountNameTakenError
              ? Strings.accountsArchivedNameTaken
              : Strings.accountsArchivedRestoreError,
        });
        return;
      } finally {
        setUnarchivingId(undefined);
      }
      if (useAccountStore.getState().archivedAccounts.length === 0) setArchivedExpanded(false);
      toast.show({ label: Strings.accountsArchivedRestored(name), variant: 'success' });
    },
    [setArchivedExpanded, setUnarchiveError, setUnarchivingId, toast, unarchiveAccount],
  );

  // The store reloads on success and on failure, so releasing the pending order shows the saved one.
  const dropRow = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const listState = useAccountsListState.getState();
      if (listState.isReordering || !isAccountsListReorderable(listState.selectedType)) return;
      const ids = useAccountStore.getState().accounts.map((account) => account.id);
      const next = resolveReorderedIds(ids, fromIndex, toIndex);
      if (next === undefined) return;

      setReordering(true);
      setPendingOrder(next);
      try {
        await reorderAccounts(next);
      } catch {
        toast.show({ label: Strings.accountsReorderError, variant: 'danger' });
      } finally {
        setPendingOrder(undefined);
        setReordering(false);
      }
    },
    [reorderAccounts, setPendingOrder, setReordering, toast],
  );

  const moveRow = useCallback(
    async (index: number, direction: ReorderDirection) => {
      const count = useAccountStore.getState().accounts.length;
      const target = resolveMoveTarget(index, direction, count);
      if (target === undefined) return;
      await dropRow(index, target);
    },
    [dropRow],
  );

  const liftRow = useCallback(
    (id: string) => {
      const listState = useAccountsListState.getState();
      if (listState.liftedId !== undefined || listState.isReordering) return;
      if (!isAccountsListReorderable(listState.selectedType)) return;
      setLiftedId(id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [setLiftedId],
  );

  // Clearing the lift before the drop's first await lands it in the commit that applies the pending order.
  const releaseRow = useCallback(
    async (id: string, fromIndex: number, toIndex: number) => {
      if (useAccountsListState.getState().liftedId !== id) return;
      setLiftedId(undefined);
      await dropRow(fromIndex, toIndex);
    },
    [dropRow, setLiftedId],
  );

  return {
    state: {
      rows,
      isReorderable,
      liftedId,
      isLifted: liftedId !== undefined,
      liftedRow,
      liftGeneration,
      canLift: isReorderable && !isReordering,
      archivedCount,
      isRetrying,
      selectedType,
      sectionTitle: resolveAccountsListSectionTitle(selectedType),
      // The unfiltered active count: a filtered-to-empty list is not an empty screen.
      content: resolveAccountsListContent({ loadError, accountCount: allRows.length }),
      emptyState,
      archived: {
        rows: archivedRows,
        summary: resolveArchivedSummary(archivedRows),
        isExpanded: isArchivedExpanded,
        unarchivingId,
        unarchiveError,
      },
    },
    goToAccount,
    goToAddAccount,
    onBack,
    retry,
    selectType: setSelectedType,
    setArchivedExpanded,
    unarchive,
    dropRow,
    moveRow,
    liftRow,
    releaseRow,
  };
}
