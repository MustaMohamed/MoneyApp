import { z } from 'zod';

export const RATE_REFRESH_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const persistedRatePattern = /^(?:\d+(?:\.\d+)?|\.\d+)$/;
const remoteRateSchema = z.object({
  rates: z.object({
    EGP: z.number().positive().finite(),
  }),
});

export function parsePersistedRate(value: string | null): number | undefined {
  const normalized = value?.trim();
  if (!normalized || !persistedRatePattern.test(normalized)) return undefined;

  const rate = Number(normalized);
  return Number.isFinite(rate) && rate > 0 ? rate : undefined;
}

export function parseRemoteRate(payload: unknown): number {
  return remoteRateSchema.parse(payload).rates.EGP;
}

interface RefreshRateInput {
  isManualOverride: boolean;
  lastFetched: string | null;
  now: number;
}

export function shouldRefreshRate({
  isManualOverride,
  lastFetched,
  now,
}: RefreshRateInput): boolean {
  if (isManualOverride) return false;
  if (!lastFetched) return true;

  const fetchedAt = Date.parse(lastFetched);
  return !Number.isFinite(fetchedAt) || now - fetchedAt >= RATE_REFRESH_MAX_AGE_MS;
}
