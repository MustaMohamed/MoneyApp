import { parsePositiveDecimal } from '@/utils/parse_decimal';

/** Gates characters only and never truncates, so `'0.005'` reaches the row validator intact. */
export function isTypeableMoneyText(text: string): boolean {
  return /^\d*\.?\d*$/.test(text);
}

// Repositions the point in `toString()`'s digits, adding and dropping none, so no float noise.
function expandExponentialNotation(text: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/i.exec(text);
  if (!match) return text;
  const [, sign, intPart, fracPart = '', expPart] = match;
  const exp = Number(expPart);
  const digits = intPart + fracPart;
  const pointIndex = intPart.length + exp;
  if (pointIndex <= 0) return `${sign}0.${'0'.repeat(-pointIndex)}${digits}`;
  if (pointIndex >= digits.length) {
    return `${sign}${digits}${'0'.repeat(pointIndex - digits.length)}`;
  }
  return `${sign}${digits.slice(0, pointIndex)}.${digits.slice(pointIndex)}`;
}

/** Prefill is re-parsed by the field validator, so it never rounds; untypeable values give `''`. */
export function formatStoredMoneyText(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = expandExponentialNotation(String(value));
  return isTypeableMoneyText(text) ? text : '';
}

// Repeated characters make the index ambiguous but not the character, so the leftmost one is safe.
function singleCharacterInsertionIndex(previous: string, next: string): number | undefined {
  if (next.length !== previous.length + 1) return undefined;
  let index = 0;
  while (index < previous.length && previous[index] === next[index]) index += 1;
  return next.slice(index + 1) === previous.slice(index) ? index : undefined;
}

/** `undefined` refuses and keeps `previous`; `''` accepts; `1,500` could mean 1500 or 1.5. */
export function maskMoneyFieldText(previous: string, next: string): string | undefined {
  if (next === previous) return next;

  const index = singleCharacterInsertionIndex(previous, next);
  if (index === undefined) {
    if (next.includes(',')) return undefined;
    return isTypeableMoneyText(next) ? next : undefined;
  }

  const candidate = next[index] === ',' ? `${next.slice(0, index)}.${next.slice(index + 1)}` : next;
  return isTypeableMoneyText(candidate) ? candidate : undefined;
}

/** Pass the field's own `variant` through; a derived boolean can mask a name field. */
export function maskFieldText(
  variant: 'name' | 'amount',
  previous: string,
  next: string,
): string | undefined {
  return variant === 'name' ? next : maskMoneyFieldText(previous, next);
}

/** Thrown when submit and schema disagree, so no fabricated `NaN` reaches the store. */
export class MoneyTextMappingError extends Error {
  constructor(readonly field: string) {
    super(`MoneyTextMappingError: ${field} did not parse`);
    this.name = 'MoneyTextMappingError';
  }
}

/** Does not round; callers hand the result to a writer that rounds at write. */
export function parseRequiredMoneyText(value: string, field: string): number {
  const parsed = parsePositiveDecimal(value);
  if (parsed === undefined) throw new MoneyTextMappingError(field);
  return parsed;
}
