import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useCurrencyStore } from '@/store/currency.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { useCurrencyScreenState } from './currency.state';

export function useCurrencyScreen() {
  const router = useRouter();
  const {
    state: currencyState,
    fetchRate,
    setManualRate,
  } = useCurrencyStore(
    useShallow((s) => ({
      state: s.state,
      fetchRate: s.fetchRate,
      setManualRate: s.setManualRate,
    })),
  );
  const {
    state: screenState,
    setManualPanelOpen,
    setFetching,
    setSaving,
    resetState,
  } = useCurrencyScreenState(
    useShallow((s) => ({
      state: s.state,
      setManualPanelOpen: s.setManualPanelOpen,
      setFetching: s.setFetching,
      setSaving: s.setSaving,
      resetState: s.reset,
    })),
  );

  useEffect(() => () => resetState(), []);

  const manualSchema = z.object({
    rate: z.string().refine(
      (v) => {
        const n = parseFloat(v);
        return Number.isFinite(n) && n > 0;
      },
      { message: Strings.errBalanceInvalid },
    ),
  });

  const form = useZodForm(manualSchema, {
    defaultValues: { rate: String(currencyState.rate) },
  });

  const handleFetchRate = async () => {
    setFetching(true);
    try {
      await fetchRate();
    } finally {
      setFetching(false);
    }
  };

  const handleSaveManualRate = form.handleSubmit(async (data) => {
    setSaving(true);
    try {
      await setManualRate(parseFloat(data.rate));
      setManualPanelOpen(false);
    } finally {
      setSaving(false);
    }
  });

  const goBack = () => router.back();

  return {
    state: {
      rate: currencyState.rate,
      lastFetched: currencyState.lastFetched,
      isManualOverride: currencyState.isManualOverride,
      isManualPanelOpen: screenState.isManualPanelOpen,
      isFetching: screenState.isFetching,
      isSaving: screenState.isSaving,
    },
    form,
    setManualPanelOpen,
    handleFetchRate,
    handleSaveManualRate,
    goBack,
  };
}
