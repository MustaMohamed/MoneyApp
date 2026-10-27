import type { AccountStripTile } from '@/components/ui/form_sheet.helpers';
import type { AccountTypeIconName } from '@/constants/account_type_icons';
import { Strings } from '@/constants/strings';

export interface DetailFactBadge {
  label: string;
  tone: 'accent' | 'neutral';
}

export type DetailFactLeading =
  | { kind: 'tile'; tile: AccountStripTile }
  | { kind: 'glyph'; glyphName: AccountTypeIconName; glyphColor: string };

export interface DetailFact<K extends string = string> {
  kind: K;
  label: string;
  value?: string;
  badge?: DetailFactBadge;
  leading?: DetailFactLeading;
  valueFace: 'sora' | 'inter';
  // A money figure or a rate shrinks to fit before it ends in an ellipsis.
  fitsValue: boolean;
}

export const DETAIL_FACT_ARCHIVED_BADGE: DetailFactBadge = {
  label: Strings.detailAccountArchived,
  tone: 'neutral',
};

export function detailFact<K extends string>(
  kind: K,
  label: string,
  rest: Partial<Omit<DetailFact<K>, 'kind' | 'label'>> = {},
): DetailFact<K> {
  return { kind, label, valueFace: 'sora', fitsValue: false, ...rest };
}
