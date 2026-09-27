import { Skeleton, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Spacing, Type, lineHeightFor } from '@/constants/theme';

import type { PolaritySignal, SearchTallyModel } from '../transactions.helpers';

const TALLY_LINE_HEIGHT = lineHeightFor(Type.micro);

export const SEARCH_TALLY_SLOT_HEIGHT = Spacing.xxs + TALLY_LINE_HEIGHT;

// The hero's Net colours under the money-colour ADR's decision 5; the tally's sum is the same net.
const SUM_CLASS: Record<PolaritySignal, string> = {
  good: 'text-success',
  bad: 'text-danger',
  neutral: 'text-foreground',
};

const SLOT_STYLE = {
  height: SEARCH_TALLY_SLOT_HEIGHT,
  paddingBottom: Spacing.xxs,
  flexDirection: 'row',
  alignItems: 'center',
} as const;
const LEFT_GROUP_STYLE = {
  flex: 1,
  minWidth: 0,
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.xs,
} as const;
const COUNT_STYLE = {
  flexShrink: 0,
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.xxs,
} as const;
const SUM_GROUP_STYLE = {
  flexShrink: 0,
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.xxs,
  marginLeft: Spacing.xs,
} as const;
const TEXT_STYLE = { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) } as const;
const SUMMARY_STYLE = { ...TEXT_STYLE, flexShrink: 1 } as const;
const SKELETON_STYLE = { height: TALLY_LINE_HEIGHT } as const;

function TallyLine({ model }: { model: SearchTallyModel }): React.ReactElement {
  return (
    <>
      <View style={LEFT_GROUP_STYLE}>
        <View style={COUNT_STYLE}>
          {model.count !== undefined && (
            <Typography
              numberOfLines={1}
              className="font-sora-semibold text-foreground tabular-nums"
              style={TEXT_STYLE}
            >
              {model.count}
            </Typography>
          )}
          <Typography
            numberOfLines={1}
            className="font-inter-semibold text-content-secondary"
            style={TEXT_STYLE}
          >
            {model.label}
          </Typography>
        </View>
        {model.filterSummary !== undefined && (
          <Typography
            numberOfLines={1}
            className="font-inter text-content-secondary"
            style={SUMMARY_STYLE}
          >
            {model.filterSummary}
          </Typography>
        )}
      </View>
      {model.sum !== undefined && (
        <View style={SUM_GROUP_STYLE}>
          <Typography
            numberOfLines={1}
            className={`font-sora-semibold tabular-nums ${SUM_CLASS[model.sumPolarity]}`}
            style={TEXT_STYLE}
          >
            {model.sum}
          </Typography>
          <Typography
            numberOfLines={1}
            className="font-inter text-content-secondary"
            style={TEXT_STYLE}
          >
            {model.currencyCode}
          </Typography>
        </View>
      )}
    </>
  );
}

export const SearchTally = React.memo(function SearchTally({
  model,
}: {
  model: SearchTallyModel;
}): React.ReactElement {
  return (
    <View testID="transactions-search-tally" className="px-4" style={SLOT_STYLE}>
      {model.mode === 'skeleton' ? (
        <Skeleton className="w-1/2 rounded-md" style={SKELETON_STYLE} />
      ) : model.mode === 'empty' ? null : (
        <TallyLine model={model} />
      )}
    </View>
  );
});
