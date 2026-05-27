import { useEffect } from 'react';
import { z } from 'zod';

import { Strings } from '@/constants/strings';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useCurrencyScreenState } from './currency.state';

export function useCurrencyScreen() {
  const rate = useCurrencyStore.useState.rate();
  const lastFetched = useCurrencyStore.useState.lastFetched();
  const isManualOverride = useCurrencyStore.useState.isManualOverride();
  const fetchRate = useCurrencyStore.getState().fetchRate;
  const setManualRate = useCurrencyStore.getState().setManualRate;
  const isFetching = useCurrencyScreenState.useState.isFetching();
  const isSaving = useCurrencyScreenState.useState.isSaving();
  const fetchError = useCurrencyScreenState.useState.fetchError();
  const setFetching = useCurrencyScreenState.getState().setFetching;
  const setSaving = useCurrencyScreenState.getState().setSaving;
  const setFetchError = useCurrencyScreenState.getState().setFetchError;
  const resetState = useCurrencyScreenState.getState().reset;

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => resetState(), []); // cleanup on unmount only; resetState is a stable Zustand action

  const formattedDate = lastFetched
    ? new Date(lastFetched).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : Strings.currencyNeverFetched;

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

  return {
    state: {
      rate,
      isManualOverride,
      isFetching,
      isSaving,
      fetchError,
      formattedDate,
    },
    form,
    handleFetchRate,
    handleSaveManualRate,
  };
}
