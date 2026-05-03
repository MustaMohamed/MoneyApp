import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { z } from 'zod';

import { Strings } from '@/constants/strings';
import { useCurrencyStore } from '@/store/currency.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { useCurrencyScreenStore } from './currency.store';

export function useCurrencyScreen() {
  const router = useRouter();
  const rate = useCurrencyStore((s) => s.rate);
  const lastFetched = useCurrencyStore((s) => s.lastFetched);
  const isManualOverride = useCurrencyStore((s) => s.isManualOverride);
  const fetchRate = useCurrencyStore((s) => s.fetchRate);
  const setManualRate = useCurrencyStore((s) => s.setManualRate);

  const isManualPanelOpen = useCurrencyScreenStore((s) => s.isManualPanelOpen);
  const setManualPanelOpen = useCurrencyScreenStore((s) => s.setManualPanelOpen);
  const resetStore = useCurrencyScreenStore((s) => s.reset);

  const [isFetching, setFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => () => resetStore(), []);

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
    setIsSaving(true);
    try {
      await setManualRate(parseFloat(data.rate));
      setManualPanelOpen(false);
    } finally {
      setIsSaving(false);
    }
  });

  const goBack = () => router.back();

  return {
    rate,
    lastFetched,
    isManualOverride,
    isManualPanelOpen,
    setManualPanelOpen,
    form,
    handleFetchRate,
    isFetching,
    handleSaveManualRate,
    isSaving,
    goBack,
  };
}
