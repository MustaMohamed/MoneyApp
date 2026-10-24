import { SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { Text } from '@/components/ui/text';
import { lineHeightFor } from '@/constants/theme';

import {
  type RowCaptionFit,
  TRANSACTION_ROW_CAPTION_FONT_SIZE,
  TRANSACTION_ROW_CAPTION_SEPARATOR,
  TRANSACTION_ROW_LINE_GAP,
  resolveRowCaptionTextProps,
  resolveRowCaptionTrail,
  resolveTransactionRowCaptionLines,
} from './transaction_row.helpers';

/** A row's caption: the trail never ellipsizes and above 1.0 takes its own line; at or below 1.0 a `'whole'` trail wraps bare under the lead, the separator ending the lead's line. */
export function RowCaption({
  lead,
  trail,
  fit,
}: {
  lead?: string;
  trail?: string;
  fit: RowCaptionFit;
}) {
  const { fontScale } = useWindowDimensions();
  const stacked = resolveTransactionRowCaptionLines(fontScale) === 2;
  const wraps = fit === 'whole' && !stacked;
  const line = resolveRowCaptionTextProps(fit, fontScale);
  const joined = wraps && lead !== undefined && trail !== undefined;
  const leadText = joined ? `${lead}${TRANSACTION_ROW_CAPTION_SEPARATOR}` : lead;
  const trailText = joined ? trail : resolveRowCaptionTrail({ lead, trail, stacked });
  return (
    <View
      style={{
        flexDirection: stacked ? 'column' : 'row',
        flexWrap: wraps ? 'wrap' : undefined,
        gap: stacked ? TRANSACTION_ROW_LINE_GAP : undefined,
        rowGap: wraps ? TRANSACTION_ROW_LINE_GAP : undefined,
        marginTop: TRANSACTION_ROW_LINE_GAP,
      }}
    >
      {leadText === undefined ? null : (
        <Text
          className="font-inter text-content-secondary"
          {...line}
          style={{ ...line.style, flexShrink: wraps ? 0 : 1 }}
        >
          {leadText}
        </Text>
      )}
      {trailText === undefined ? null : (
        <Text
          className="font-inter text-content-secondary"
          {...line}
          style={{ ...line.style, flexShrink: 0 }}
        >
          {trailText}
        </Text>
      )}
    </View>
  );
}

/** The caption bars of a row skeleton: a second bar while the caption takes two lines. */
export function RowCaptionSkeleton() {
  const { fontScale } = useWindowDimensions();
  const bar = {
    height: resolveSkeletonBarHeight(lineHeightFor(TRANSACTION_ROW_CAPTION_FONT_SIZE), fontScale),
    marginTop: TRANSACTION_ROW_LINE_GAP,
  };
  return (
    <>
      <SkeletonGroup.Item className="w-20 rounded-md" style={bar} />
      {resolveTransactionRowCaptionLines(fontScale) === 2 ? (
        <SkeletonGroup.Item className="w-14 rounded-md" style={bar} />
      ) : null}
    </>
  );
}
