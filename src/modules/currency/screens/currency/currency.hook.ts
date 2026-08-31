import { useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { CURRENCY_CONFIG } from '@/constants/currency';
import { Strings } from '@/constants/strings';
import { isRateImplausible } from '@/modules/currency/domain/rate_plausibility';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
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
  // A screen-entry hook reads the base from the store; a shared component hook
  // takes it as a parameter (`use_account_form.hook.ts:14-19`, whose two hosts
  // disagree on the value). This hook backs a one-line route re-export and has
  // no host to pass it from — the same position `dashboard.hook.ts:90` is in.
  // Plain selector, not `useShallow`: a single scalar, per `welcome.hook.ts:14`.
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
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
  useEffect(() => () => resetState(), []); // cleanup on unmount only; resetState is a stable Zustand action

  const formattedDate = lastFetched
    ? new Date(lastFetched).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : Strings.currencyNeverFetched;

  // Composed here, not in the screen: `formattedDate` above is the in-file
  // precedent for a display string built in the hook, and it keeps
  // `CURRENCY_CONFIG` out of a `.tsx`.
  const footerNote = Strings.currencyFooterNote(
    CURRENCY_CONFIG[baseCurrency].label,
    CURRENCY_CONFIG[baseCurrency].code,
  );

  const form = useZodForm(manualRateSchema, {
    defaultValues: { rate: String(rate) },
  });

  // ONE writer for the warning slot, and it subscribes rather than being called
  // from a handler. `fetchRate` has two callers — the button below and
  // `currency.store.ts:147-148`'s background `refreshRateIfStale`, driven from
  // `src/app/(app)/_layout.tsx:16` — and `_layout.tsx:23` sets
  // `freezeOnBlur: true`, so returning to Settings is not a fresh mount. Writing
  // after `await fetchRate()` would publish without re-checking freshness
  // (`.claude/rules/state.md:20`) and would still miss the background caller.
  //
  // The dirty gate chooses the SUBJECT, and the `rate` dep alone cannot:
  // `defaultValues` seeds the field once and nothing writes the form afterwards,
  // so a fetched rate re-runs this effect against the same stale text. Pristine
  // field, and the stored rate is the subject — that is mount with an
  // already-stored out-of-band rate, and a refresh landing while the screen is
  // open. Dirty field, and the user's own draft is, because the slot renders
  // directly under the input and describes it.
  //
  // No throw path: `parseRateText` returns `undefined` rather than a bad number,
  // and the store's `rate` is finite and positive by construction.
  //
  // Known residual: a refresh landing under an unsaved out-of-band draft warns
  // about the draft rather than the fetched value, which is visible in the card
  // above. It reaches the button path here as well as the background one —
  // `shouldRefreshRate`'s manual-override short-circuit only covers the second.
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
      saveError,
      formattedDate,
      footerNote,
    },
    form,
    handleFetchRate,
    handleSaveManualRate,
  };
}
