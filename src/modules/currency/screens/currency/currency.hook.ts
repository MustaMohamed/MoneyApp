import { useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { CURRENCY_CONFIG } from '@/constants/currency';
import { Strings } from '@/constants/strings';
import { isRateImplausible } from '@/modules/currency/domain/rate_plausibility';
import { useBaseCurrencyStore } from '@/modules/currency/store/base_currency.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { formatStoredMoneyText } from '@/utils/money_text';
import { parseRateText } from '@/utils/parse_decimal';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useCurrencyScreenState } from './currency.state';

const manualRateSchema = z.object({
  rate: z.string().refine((value) => parseRateText(value) !== undefined, {
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
  const baseCurrency = useBaseCurrencyStore((s) => s.baseCurrency);
  const { isFetching, isSaving, fetchError, rateWarning, saveError } = useCurrencyScreenState(
    useShallow((s) => ({
      isFetching: s.isFetching,
      isSaving: s.isSaving,
      fetchError: s.fetchError,
      rateWarning: s.rateWarning,
      saveError: s.saveError,
    })),
  );
  const setFetching = useCurrencyScreenState.getState().setFetching;
  const setSaving = useCurrencyScreenState.getState().setSaving;
  const setFetchError = useCurrencyScreenState.getState().setFetchError;
  const setRateWarning = useCurrencyScreenState.getState().setRateWarning;
  const setSaveError = useCurrencyScreenState.getState().setSaveError;
  const resetState = useCurrencyScreenState.getState().reset;

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => resetState(), []); // `resetState` is a stable Zustand action

  const formattedDate = lastFetched
    ? new Date(lastFetched).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : Strings.currencyNeverFetched;

  const footerNote = Strings.currencyFooterNote(
    CURRENCY_CONFIG[baseCurrency].label,
    CURRENCY_CONFIG[baseCurrency].code,
  );

  // Judged at render: the accordion reads `defaultValue` once, when `rateWarning` is still empty.
  const isStoredRateImplausible = isRateImplausible(rate);

  const form = useZodForm(manualRateSchema, {
    defaultValues: { rate: formatStoredMoneyText(rate) },
  });

  // One writer for the warning slot: `fetchRate` has a background caller too, so subscribe here.
  const rateField = useWatch({ control: form.control, name: 'rate' });
  const isRateFieldDirty = form.formState.dirtyFields.rate === true;
  useEffect(() => {
    const typed = isRateFieldDirty ? parseRateText(rateField) : undefined;
    setRateWarning(isRateImplausible(typed ?? rate) ? Strings.currencyRateImplausibleWarning : '');
  }, [isRateFieldDirty, rate, rateField, setRateWarning]);

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
    const rate = parseRateText(data.rate);
    if (rate === undefined) return;

    setSaving(true);
    setSaveError('');
    try {
      await setManualRate(rate);
    } catch {
      setSaveError(Strings.currencySaveError);
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
      rateWarning,
      isStoredRateImplausible,
      saveError,
      formattedDate,
      footerNote,
    },
    form,
    handleFetchRate,
    handleSaveManualRate,
  };
}
