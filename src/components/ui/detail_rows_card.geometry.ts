import type { ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';

// DetailRowsCard's `mt-4`, unscaled CSS px.
export const DETAIL_ROWS_CARD_MARGIN_TOP = 16;

export const DETAIL_ROWS_CARD_STYLE: Readonly<ViewStyle> = Object.freeze({
  borderRadius: Radius.detailCard,
  marginTop: DETAIL_ROWS_CARD_MARGIN_TOP,
});
