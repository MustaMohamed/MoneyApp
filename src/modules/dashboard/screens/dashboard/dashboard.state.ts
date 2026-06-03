import { batch, type Signal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

import type { DashboardSegment } from './types';

export type { DashboardSegment };

interface DashboardStateShape {
  isBreakdownVisible: Signal<boolean>;
  refreshing: Signal<boolean>;
  selectedSegment: Signal<DashboardSegment>;
}

type DashboardStateActions = {
  setBreakdownVisible: (v: boolean) => void;
  setRefreshing: (v: boolean) => void;
  setSelectedSegment: (s: DashboardSegment) => void;
  reset: () => void;
};

export function useDashboardState(): { state: DashboardStateShape } & DashboardStateActions {
  const isBreakdownVisible = useSignal(false);
  const refreshing = useSignal(false);
  const selectedSegment = useSignal<DashboardSegment>('overview');

  const setBreakdownVisible = useCallback(
    (v: boolean) => {
      isBreakdownVisible.value = v;
    },
    [isBreakdownVisible],
  );

  const setRefreshing = useCallback(
    (v: boolean) => {
      refreshing.value = v;
    },
    [refreshing],
  );

  const setSelectedSegment = useCallback(
    (s: DashboardSegment) => {
      selectedSegment.value = s;
    },
    [selectedSegment],
  );

  const reset = useCallback(() => {
    batch(() => {
      isBreakdownVisible.value = false;
      refreshing.value = false;
      selectedSegment.value = 'overview';
    });
  }, [isBreakdownVisible, refreshing, selectedSegment]);

  return {
    state: {
      isBreakdownVisible,
      refreshing,
      selectedSegment,
    },
    setBreakdownVisible,
    setRefreshing,
    setSelectedSegment,
    reset,
  };
}
