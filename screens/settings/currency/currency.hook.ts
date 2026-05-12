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
    setFetching,
    setSaving,
    setFetchError,
    resetState,
  } = useCurrencyScreenState(
    useShallow((s) => ({
      state: s.state,
      setFetching: s.setFetching,
      setSaving: s.setSaving,
      setFetchError: s.setFetchError,
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
    setFetchError('');
    try {
      await fetchRate();
    } catch {
      setFetchError(Strings.currencyFetchError);
    } finally {
      setFetching(false);
    }
  };

  const handleSaveManualRate = form.handleSubmit(async (data) => {
    setSaving(true);
    try {
      await setManualRate(parseFloat(data.rate));
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
      isFetching: screenState.isFetching,
      isSaving: screenState.isSaving,
      fetchError: screenState.fetchError,
    },
    form,
    handleFetchRate,
    handleSaveManualRate,
    goBack,
  };
}
