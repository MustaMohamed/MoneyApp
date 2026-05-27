/**
 * Pure parse-and-validate for the Adjust Balance input.
 * Mirrors the V1 inline guard verbatim ([layla] §3.4): the value must be
 * finite and >= 0. Applies to ALL account types including credit cards.
 */
export type AdjustParseResult = { ok: true; value: number } | { ok: false };

export function parseAdjustInput(raw: string): AdjustParseResult {
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false };
  }
  return { ok: true, value: n };
}
