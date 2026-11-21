import type { AccountType } from '@/constants/enums';

/** A tile's `color` is `null` for an account with no colour; a dot always has one. */
export type ChipLead =
  | { kind: 'tile'; color: string | null; type: AccountType }
  | { kind: 'dot'; color: string };

export interface ChipRowItem {
  id: string;
  label: string;
  accessibilityLabel: string;
  /** `undefined` draws a text-only chip. */
  lead: ChipLead | undefined;
}

export interface ChipRowModel {
  /** `undefined` is the All chip. */
  id: string | undefined;
  label: string;
  accessibilityLabel: string;
  lead: ChipLead | undefined;
  selected: boolean;
}

/** All first, lit exactly when no item matches `selectedId`, then the items in input order. */
export function buildChipRow(
  allLabel: string,
  items: readonly ChipRowItem[],
  selectedId: string | undefined,
): ChipRowModel[] {
  const chips = items.map((item) => ({ ...item, selected: item.id === selectedId }));
  return [
    {
      id: undefined,
      label: allLabel,
      accessibilityLabel: allLabel,
      lead: undefined,
      selected: !chips.some((chip) => chip.selected),
    },
    ...chips,
  ];
}
