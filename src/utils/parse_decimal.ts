const DECIMAL_PATTERN = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;

export function parseNonNegativeDecimal(value: string): number | undefined {
  const normalized = value.trim();
  if (!DECIMAL_PATTERN.test(normalized)) return undefined;
  const parsed = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parsePositiveDecimal(value: string): number | undefined {
  const parsed = parseNonNegativeDecimal(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}
