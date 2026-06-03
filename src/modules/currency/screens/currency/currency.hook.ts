import { useEffect } from 'react';
import { z } from 'zod';

import { Strings } from '@/constants/strings';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useCurrencyScreenState } from './currency.state';

export function useCurrencyScreen() {
  const currencyStore = useCurrencyStore();
  const rate = currencyStore.rate;
  const lastFetched = currencyStore.lastFetched;
  const isManualOverride = currencyStore.isManualOverride;
  const fetchRate = currencyStore.fetchRate;
  const setManualRate = currencyStore.setManualRate;
  const {
    state: screenState,
    setFetching,
    setSaving,
    setFetchError,
    reset: resetState,
  } = useCurrencyScreenState();

  useEffect(() => () => resetState(), [resetState]);

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
      isFetching: screenState.isFetching,
      isSaving: screenState.isSaving,
      fetchError: screenState.fetchError,
      formattedDate,
    },
    form,
    handleFetchRate,
    handleSaveManualRate,
  };
}
