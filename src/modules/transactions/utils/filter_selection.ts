import type { AmountRangeBounds } from './amount_range_filter';

export type NamedEntity = { name: string };

export function formatSelectionSummary(names: readonly string[], allLabel: string): string {
  if (names.length === 0) return allLabel;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

export function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
}

export function hasAmountFilter(bounds: AmountRangeBounds): boolean {
  return bounds.amountMin !== undefined || bounds.amountMax !== undefined;
}

export function selectedNames(
  ids: readonly string[],
  source: ReadonlyMap<string, NamedEntity>,
): string[] {
  return ids.map((id) => source.get(id)?.name).filter((name): name is string => name !== undefined);
}
