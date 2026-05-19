import React from 'react';
import { Pressable, View } from 'react-native';
import { Input } from 'heroui-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { roundMoney } from '@/utils/money';

const STALE_THRESHOLD_DAYS = 30;

function isStale(rateUpdatedAt: string | null): boolean {
  if (!rateUpdatedAt) return false;
  const updated = new Date(rateUpdatedAt).getTime();
  if (isNaN(updated)) return false;
  const ageMs = Date.now() - updated;
  return ageMs > STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}

function formatPreviewAmount(amount: number, rateStr: string): string {
  const rate = parseFloat(rateStr);
  if (isNaN(rate) || rate <= 0) return '—';
  const egp = roundMoney(amount * rate);
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(egp);
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  overrideEnabled: boolean;
  onToggleOverride: () => void;
  rateUpdatedAt: string | null;
  amount: number;
  error?: string;
}

export function ExchangeRateRow({
  value,
  onChange,
  overrideEnabled,
  onToggleOverride,
  rateUpdatedAt,
  amount,
  error,
}: Props): React.ReactElement {
  const stale = isStale(rateUpdatedAt);

  const subtitle = overrideEnabled
    ? Strings.addTxRateSourceCustom
    : rateUpdatedAt
      ? `${Strings.addTxRateSourceStored} · ${Strings.addTxRateLastUpdated.replace('{date}', formatDateShort(rateUpdatedAt))}`
      : Strings.addTxRateSourceStored;

  return (
    <View className="mt-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-3">
      <Pressable
        testID="exchange-rate-row"
        onPress={() => {
          if (!overrideEnabled) onToggleOverride();
        }}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-sora font-semibold text-[14px] text-foreground">Exchange Rate</Text>
          <Text className="font-inter text-[11px] text-muted mt-0.5">{subtitle}</Text>
          {stale ? (
            <Text className="font-inter text-[11px] text-warning mt-0.5">
              {Strings.addTxRateStale}
            </Text>
          ) : null}
        </View>
        {overrideEnabled ? (
          <View style={{ width: 100 }}>
            <Input
              testID="exchange-rate-input"
              value={value}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
        ) : (
          <Text className="font-sora font-semibold text-[15px] text-foreground">{value}</Text>
        )}
      </Pressable>

      {/* Live EGP preview */}
      <Text className="font-inter text-[12px] text-muted mt-2">
        {Strings.addTxEgpPreview.replace('{amount}', formatPreviewAmount(amount, value))}
      </Text>

      {overrideEnabled ? (
        <Pressable onPress={onToggleOverride} className="mt-2 self-end">
          <Text className="font-inter text-[12px] text-accent">{Strings.addTxRateReset}</Text>
        </Pressable>
      ) : null}

      {error ? <Text className="font-inter text-[11px] text-danger mt-1">{error}</Text> : null}
    </View>
  );
}
