import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { z } from 'zod';

import { Strings } from '@/constants/strings';
import { useCurrencyStore } from '@/store/currency.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { useCurrencyScreenState } from './currency.state';

export function useCurrencyScreen() {
  const router = useRouter();
  const rate = useCurrencyStore((s) => s.rate);
  const lastFetched = useCurrencyStore((s) => s.lastFetched);
  const isManualOverride = useCurrencyStore((s) => s.isManualOverride);
  const fetchRate = useCurrencyStore((s) => s.fetchRate);
  const setManualRate = useCurrencyStore((s) => s.setManualRate);

  const screenState = useCurrencyScreenState((s) => s.state);
  const setManualPanelOpen = useCurrencyScreenState((s) => s.setManualPanelOpen);
  const setFetching = useCurrencyScreenState((s) => s.setFetching);
  const setSaving = useCurrencyScreenState((s) => s.setSaving);
  const resetState = useCurrencyScreenState((s) => s.reset);

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
    defaultValues: { rate: String(rate) },
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
      rate,
      lastFetched,
      isManualOverride,
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
