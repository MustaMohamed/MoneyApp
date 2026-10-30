import { SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import { DayCardsSkeleton } from '@/components/ui/day_cards_skeleton';
import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { Strings } from '@/constants/strings';
import { Radius, Size, lineHeightFor } from '@/constants/theme';
import { RowCaptionSkeleton } from '@/modules/transactions/components/row_caption';

import {
  COMMITMENT_ROW_AMOUNT_FONT_SIZE,
  COMMITMENT_ROW_CAPTION_FONT_SIZE,
  COMMITMENT_ROW_LINE_GAP,
  COMMITMENT_ROW_TITLE_FONT_SIZE,
  resolveCommitmentRowHeight,
} from './commitment_row.helpers';

const SKELETON_DAY_CARDS = 2;
const SKELETON_ROWS_PER_CARD = 3;

function SkeletonRow({
  row,
  showSeparator,
}: {
  row: number;
  showSeparator: boolean;
}): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const lineBar = (fontSize: number): number =>
    resolveSkeletonBarHeight(lineHeightFor(fontSize), fontScale);
  return (
    <View
      testID="commitment-row-skeleton"
      style={{ height: resolveCommitmentRowHeight(fontScale), justifyContent: 'center' }}
      className={showSeparator ? 'border-separator border-b px-4' : 'px-4'}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-3">
        <SkeletonGroup.Item
          testID="commitment-row-skeleton-tile"
          style={{
            width: Size.accountTile,
            height: Size.accountTile,
            borderRadius: Radius.sm,
          }}
        />
        <View style={{ flex: 1 }}>
          <SkeletonGroup.Item
            className={row % 2 === 0 ? 'w-36 rounded-md' : 'w-28 rounded-md'}
            style={{ height: lineBar(COMMITMENT_ROW_TITLE_FONT_SIZE) }}
          />
          <RowCaptionSkeleton />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <SkeletonGroup.Item
            className={row % 2 === 0 ? 'w-24 rounded-md' : 'w-20 rounded-md'}
            style={{ height: lineBar(COMMITMENT_ROW_AMOUNT_FONT_SIZE) }}
          />
          <SkeletonGroup.Item
            className="w-12 rounded-md"
            style={{
              height: lineBar(COMMITMENT_ROW_CAPTION_FONT_SIZE),
              marginTop: COMMITMENT_ROW_LINE_GAP,
            }}
          />
        </View>
      </View>
    </View>
  );
}

export function CommitmentRowsSkeleton(): React.ReactElement {
  return (
    <View testID="commitment-row-skeletons" accessibilityLabel={Strings.loadingCommitmentsA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        <DayCardsSkeleton
          dayCards={SKELETON_DAY_CARDS}
          rows={SKELETON_ROWS_PER_CARD}
          renderRow={(row, showSeparator) => (
            <SkeletonRow row={row} showSeparator={showSeparator} />
          )}
        />
      </SkeletonGroup>
    </View>
  );
}
