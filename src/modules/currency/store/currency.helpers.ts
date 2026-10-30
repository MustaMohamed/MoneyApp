import { z } from 'zod';

export const RATE_REFRESH_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RATE_STALE_THRESHOLD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;

/** Strictly past 30 days from the stored rate's update; no update time, an unparseable one or a future one is fresh. */
export function isRateStale(rateUpdatedAt: string | null, nowMs: number): boolean {
  if (rateUpdatedAt === null) return false;
  const updated = new Date(rateUpdatedAt).getTime();
  if (isNaN(updated)) return false;
  return nowMs - updated > RATE_STALE_THRESHOLD_DAYS * DAY_MS;
}

/** The wait to the first instant `isRateStale` reads true, capped at one `setTimeout`'s reach; `undefined` when no later read can change the mark. */
export function resolveRateStaleDelayMs(
  rateUpdatedAt: string | null,
  nowMs: number,
): number | undefined {
  if (rateUpdatedAt === null || isRateStale(rateUpdatedAt, nowMs)) return undefined;
  const updated = new Date(rateUpdatedAt).getTime();
  if (isNaN(updated)) return undefined;
  const delayMs = updated + RATE_STALE_THRESHOLD_DAYS * DAY_MS + 1 - nowMs;
  return Math.min(delayMs, MAX_TIMER_DELAY_MS);
}

const persistedRatePattern = /^(?:\d+(?:\.\d+)?|\.\d+)$/;
const persistedTimestampSchema = z.iso.datetime();
const remoteRateSchema = z.object({
  rates: z.object({
    EGP: z.number().positive(),
  }),
});

export function parsePersistedRate(value: string | null): number | undefined {
  const normalized = value?.trim();
  if (!normalized || !persistedRatePattern.test(normalized)) return undefined;

  const rate = Number(normalized);
  return Number.isFinite(rate) && rate > 0 ? rate : undefined;
}

export function parsePersistedTimestamp(value: string | null): string | null {
  return value && persistedTimestampSchema.safeParse(value).success ? value : null;
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
