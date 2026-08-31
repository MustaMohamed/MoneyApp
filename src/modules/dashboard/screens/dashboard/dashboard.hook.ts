import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { AccountStats } from '@/modules/accounts/database/account_stats';
import { isRateUsable } from '@/modules/accounts/domain/account_aggregation';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { BudgetDashboardSummaryVM } from '@/modules/budget/screens/budget/budget.helpers';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import type { DashboardLoadInput } from '@/modules/dashboard/repositories/dashboard.repository';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { formatMonthYear } from '@/utils/format_date';
import { runAfterInteractions } from '@/utils/run_after_interactions';
import { currentYearMonth, shiftYearMonth } from '@/utils/year_month';

import {
  computeDashboardAccountCounts,
  computeDashboardCommitmentSummary,
  computeDashboardSpendDeltaPct,
  computeLiabilitiesBreakdown,
  computeLiquidityBreakdown,
  computeNetWorth,
  groupAccountsByType,
  type DashboardMonthFacts,
} from './dashboard.helpers';
import { selectDashboardPresentation } from './dashboard.presentation';
import { useDashboardState } from './dashboard.state';
import { useDashboardStore } from './dashboard.store';
import type { DashboardSegment } from './types';

const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_STATS_MAP: Record<string, AccountStats> = {};
const EMPTY_COMMITMENT_PAYMENTS: CommitmentPayment[] = [];
const EMPTY_MONTH_FACTS: DashboardMonthFacts = {
  totals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
  spend: { totalEgp: 0, usdNative: 0, count: 0 },
};
const EMPTY_BUDGET_SUMMARY: BudgetDashboardSummaryVM = {
  budgeted: 0,
  spent: 0,
  left: 0,
  pct: 0,
  categoryCount: 0,
};

function createDashboardLoadInput(now = new Date()): DashboardLoadInput {
  return { yearMonth: currentYearMonth(now), now };
}

export function useDashboard() {
  const router = useRouter();
  const transactionMutationVersion = useTransactionStore.useState.mutationVersion();
  const isFocusedRef = useRef(false);
  const handledTransactionMutationVersionRef = useRef(transactionMutationVersion);
  const { snapshot, status, requestedKey } = useDashboardStore(
    useShallow((state) => ({
      snapshot: state.snapshot,
      status: state.status,
      requestedKey: state.requestedKey,
    })),
  );
  const { rate, isManualOverride, rateUpdatedAt } = useCurrencyStore(
    useShallow((state) => ({
      rate: state.rate,
      // Both provenance fields feed `isRateUsable`, which accepts EITHER: the
      // rate alone cannot tell a verified value from the placeholder, since
      // `INITIAL_STATE.rate` is 50. `isManualOverride` was already selected here
      // for `hero_card.tsx`'s manual badge; the gate is its second reader, not a
      // new subscription.
      isManualOverride: state.isManualOverride,
      rateUpdatedAt: state.rate_updated_at,
    })),
  );
  // The base currency enters the dashboard HERE and nowhere else, then travels
  // down as a parameter — no `domain/` file imports a store. A plain selector,
  // not `useShallow`: it is a single scalar, matching `welcome.hook.ts:14` and
  // `ready.hook.ts:19`.
  //
  // A screen-entry hook reads the store; a shared component hook takes the value
  // as a parameter (`use_account_form.hook.ts:14-19`, whose two hosts disagree
  // on the value). This hook backs a one-line route re-export and has no host to
  // pass from.
  //
  // No new loading state is needed: `use_layout_init.hook.ts:38` awaits
  // `initOnboarding()` inside its startup `Promise.all`, and `_layout.tsx:78`
  // renders `<Stack>` only at `status === 'ready'`, so the store is hydrated
  // before this screen mounts.
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
  const { isBreakdownVisible, selectedSegment } = useDashboardState(
    useShallow((state) => ({
      isBreakdownVisible: state.isBreakdownVisible,
      selectedSegment: state.selectedSegment,
    })),
  );
  const setBreakdownVisibleState = useDashboardState.getState().setBreakdownVisible;
  const setSelectedSegmentState = useDashboardState.getState().setSelectedSegment;

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      handledTransactionMutationVersionRef.current = useTransactionStore.getState().mutationVersion;
      setSelectedSegmentState('overview');
      const task = runAfterInteractions(() =>
        useDashboardStore.getState().ensureSnapshot(createDashboardLoadInput()),
      );

      return () => {
        isFocusedRef.current = false;
        task.cancel();
        useDashboardStore.getState().invalidate();
      };
    }, [setSelectedSegmentState]),
  );

  useEffect(() => {
    if (handledTransactionMutationVersionRef.current === transactionMutationVersion) return;
    handledTransactionMutationVersionRef.current = transactionMutationVersion;
    if (!isFocusedRef.current) return;

    void useDashboardStore.getState().revalidateAfterMutation(createDashboardLoadInput());
  }, [transactionMutationVersion]);

  const refresh = useCallback(
    () => useDashboardStore.getState().refresh(createDashboardLoadInput()),
    [],
  );
  const retry = useCallback(
    () => useDashboardStore.getState().retry(createDashboardLoadInput()),
    [],
  );

  const presentation = useMemo(
    () => selectDashboardPresentation({ status, snapshot, requestedKey }),
    [requestedKey, snapshot, status],
  );
  const setBreakdownVisible = useCallback(
    (visible: boolean) => {
      if (visible && !presentation.hasSnapshot) return;
      setBreakdownVisibleState(visible);
    },
    [presentation.hasSnapshot, setBreakdownVisibleState],
  );
  const setSelectedSegment = useCallback(
    (segment: DashboardSegment) => {
      if (!presentation.hasSnapshot) return;
      setSelectedSegmentState(segment);
    },
    [presentation.hasSnapshot, setSelectedSegmentState],
  );

  useEffect(() => {
    if (!presentation.hasSnapshot && isBreakdownVisible) {
      setBreakdownVisibleState(false);
    }
  }, [isBreakdownVisible, presentation.hasSnapshot, setBreakdownVisibleState]);

  const matchingSnapshot = snapshot?.key === requestedKey ? snapshot : undefined;
  const accounts = matchingSnapshot?.accounts ?? EMPTY_ACCOUNTS;
  const statsMap = matchingSnapshot?.statsMap ?? EMPTY_STATS_MAP;
  const currentMonth = matchingSnapshot?.currentMonth ?? EMPTY_MONTH_FACTS;
  const previousMonth = matchingSnapshot?.previousMonth ?? EMPTY_MONTH_FACTS;
  const budgetSummary = matchingSnapshot?.budgetSummary ?? EMPTY_BUDGET_SUMMARY;
  const commitmentPayments = matchingSnapshot?.commitmentPayments ?? EMPTY_COMMITMENT_PAYMENTS;
  const yearMonth = matchingSnapshot?.yearMonth ?? currentYearMonth();
  const previousYearMonth = matchingSnapshot?.previousYearMonth ?? shiftYearMonth(yearMonth, -1);

  const netWorth = useMemo(
    () => computeNetWorth({ accounts, baseCurrency, rate, rateUpdatedAt, isManualOverride }),
    [accounts, baseCurrency, isManualOverride, rate, rateUpdatedAt],
  );
  // Decided ONCE, here, and passed down to every surface that converts. The
  // account cards used to answer this question for themselves — their "In EGP"
  // row converted unconditionally — which is how the accounts tab came to
  // render `5,000 EGP` under a strip refusing to state a total. Re-deriving
  // provenance as `rate > 0` at a display layer is the defect class #255 exists
  // to remove: `INITIAL_STATE.rate` is 50.
  const rateUsable = isRateUsable({ rate, rateUpdatedAt, isManualOverride });
  const liquidity = useMemo(
    () => computeLiquidityBreakdown(accounts, rate, baseCurrency),
    [accounts, baseCurrency, rate],
  );
  const liabilities = useMemo(
    () => computeLiabilitiesBreakdown(accounts, rate, baseCurrency),
    [accounts, baseCurrency, rate],
  );
  const groupedAccounts = useMemo(() => groupAccountsByType(accounts), [accounts]);
  const accountCounts = useMemo(() => computeDashboardAccountCounts(accounts), [accounts]);
  const commitments = useMemo(
    () => computeDashboardCommitmentSummary(commitmentPayments),
    [commitmentPayments],
  );
  const spendDeltaPct = useMemo(
    () => computeDashboardSpendDeltaPct(currentMonth.spend.totalEgp, previousMonth.spend.totalEgp),
    [currentMonth, previousMonth],
  );

  const goToAccount = useCallback((id: string) => router.push(`/accounts/${id}`), [router]);
  const goToAddAccount = useCallback(() => router.push('/accounts/add_account'), [router]);
  const goToSettings = useCallback(() => router.push('/settings'), [router]);
  const goToTransactions = useCallback(() => router.push('/(app)/(tabs)/transactions'), [router]);
  const goToBudget = useCallback(() => router.push('/(app)/(tabs)/budget'), [router]);
  const goToCommitments = useCallback(() => router.push('/(app)/(tabs)/commitments'), [router]);

  return {
    state: {
      presentation,
      accounts,
      baseCurrency,
      rate,
      isRateUsable: rateUsable,
      isManualOverride,
      netWorth,
      liquidity,
      liabilities,
      groupedAccounts,
      statsMap,
      isBreakdownVisible: presentation.hasSnapshot && isBreakdownVisible,
      selectedSegment: presentation.hasSnapshot ? selectedSegment : 'overview',
      monthSpend: {
        currentEgp: currentMonth.spend.totalEgp,
        currentUsdNative: currentMonth.spend.usdNative,
        currentCount: currentMonth.spend.count,
        previousEgp: previousMonth.spend.totalEgp,
        deltaPct: spendDeltaPct,
        yearMonth,
        loading: presentation.cardLoading,
      },
      accountCounts,
      commitments: {
        ...commitments,
        yearMonth,
        loading: presentation.cardLoading,
      },
      transactions: {
        current: currentMonth.totals,
        previous: matchingSnapshot ? previousMonth.totals : null,
        previousLabel: formatMonthYear(previousYearMonth),
        yearMonth,
        loading: presentation.cardLoading,
      },
      budget: {
        summary: budgetSummary,
        yearMonth,
        loading: presentation.cardLoading,
      },
    },
    setBreakdownVisible,
    setSelectedSegment,
    refresh,
    retry,
    goToAccount,
    goToAddAccount,
    goToSettings,
    goToTransactions,
    goToBudget,
    goToCommitments,
  };
}
