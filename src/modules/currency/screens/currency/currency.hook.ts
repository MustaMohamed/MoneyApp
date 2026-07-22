import { useEffect } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { parsePositiveDecimal } from '@/utils/parse_decimal';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useCurrencyScreenState } from './currency.state';

const manualRateSchema = z.object({
  rate: z.string().refine((value) => parsePositiveDecimal(value) !== undefined, {
    message: Strings.errBalanceInvalid,
  }),
});

export function useCurrencyScreen() {
  const { rate, lastFetched, isManualOverride } = useCurrencyStore(
    useShallow((s) => ({
      rate: s.rate,
      lastFetched: s.lastFetched,
      isManualOverride: s.isManualOverride,
    })),
  );
  const fetchRate = useCurrencyStore.getState().fetchRate;
  const setManualRate = useCurrencyStore.getState().setManualRate;
  const { isFetching, isSaving, fetchError } = useCurrencyScreenState(
    useShallow((s) => ({
      isFetching: s.isFetching,
      isSaving: s.isSaving,
      fetchError: s.fetchError,
    })),
  );
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

  const form = useZodForm(manualRateSchema, {
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
    const rate = parsePositiveDecimal(data.rate);
    if (rate === undefined) return;

    setSaving(true);
    try {
      await setManualRate(rate);
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
