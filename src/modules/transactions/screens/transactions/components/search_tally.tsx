import { Skeleton, Typography } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Spacing, Type, lineHeightFor } from '@/constants/theme';

import { FLOW_CLASS, type SearchTallyModel } from '../transactions.helpers';
import { resolveSearchTallyGeometry } from './transactions_text.geometry';

const SLOT_STYLE = {
  paddingBottom: Spacing.xxs,
  flexDirection: 'row',
  alignItems: 'center',
} as const;
const SUM_GROUP_STYLE = {
  flexShrink: 0,
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.xxs,
  marginLeft: Spacing.xs,
} as const;
const TEXT_STYLE = { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) } as const;
const COUNT_LINE_STYLE = { ...TEXT_STYLE, flex: 1, minWidth: 0 } as const;

function TallyLine({ model }: { model: SearchTallyModel }): React.ReactElement {
  return (
    <>
      {/* One tail-ellipsised line: the summary truncates first, then the label; spaces, since RN Android drops margins on inline text. */}
      <Typography
        numberOfLines={1}
        ellipsizeMode="tail"
        className="font-inter text-content-secondary"
        style={COUNT_LINE_STYLE}
      >
        {model.count !== undefined && (
          <Typography
            className="font-sora-semibold text-foreground tabular-nums"
            style={TEXT_STYLE}
          >
            {`${model.count} `}
          </Typography>
        )}
        <Typography className="font-inter-semibold text-content-secondary" style={TEXT_STYLE}>
          {model.label}
        </Typography>
        {model.filterSummary !== undefined && ` ${model.filterSummary}`}
      </Typography>
      {model.sum !== undefined && (
        <View style={SUM_GROUP_STYLE}>
          <Typography
            numberOfLines={1}
            className={`font-sora-semibold tabular-nums ${FLOW_CLASS[model.sum.polarity]}`}
            style={TEXT_STYLE}
          >
            {model.sum.text}
          </Typography>
          <Typography
            numberOfLines={1}
            className="font-inter text-content-secondary"
            style={TEXT_STYLE}
          >
            {model.sum.currencyCode}
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
  const geometry = resolveSearchTallyGeometry(useWindowDimensions().fontScale);
  return (
    <View
      testID="transactions-search-tally"
      className="px-4"
      style={[SLOT_STYLE, { height: geometry.slotHeight }]}
      accessible={model.accessibilityLabel !== undefined}
      accessibilityLabel={model.accessibilityLabel}
    >
      {model.mode === 'skeleton' ? (
        <Skeleton className="w-1/2 rounded-md" style={{ height: geometry.lineHeight }} />
      ) : model.mode === 'empty' ? null : (
        <TallyLine model={model} />
      )}
    </View>
  );
});
