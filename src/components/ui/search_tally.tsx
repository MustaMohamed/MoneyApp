import { Skeleton, Typography } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { FLOW_CLASS, type PolaritySignal } from '@/components/ui/flow_polarity';
import { resolveSearchTallyGeometry } from '@/components/ui/search_tally.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

export type SearchTallyMode = 'empty' | 'skeleton' | 'failed' | 'figures';

export interface SearchTallyModel {
  mode: SearchTallyMode;
  /** A leading name, the one text that truncates. */
  lead?: string;
  count: string | undefined;
  label: string;
  filterSummary: string | undefined;
  sum: { text: string; polarity: PolaritySignal; currencyCode: string } | undefined;
  accessibilityLabel: string | undefined;
}

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
const COUNT_LINE_STYLE = { flex: 1, minWidth: 0 } as const;
const LEAD_ROW_STYLE = { flex: 1, minWidth: 0, flexDirection: 'row' } as const;
export const SEARCH_TALLY_LEAD_STYLE = { flexShrink: 1, minWidth: 0 } as const;
export const SEARCH_TALLY_WHOLE_STYLE = { flexShrink: 0 } as const;

interface TallyTextStyle {
  fontSize: number;
  lineHeight: number;
}

function TallyWords({
  model,
  textStyle,
}: {
  model: SearchTallyModel;
  textStyle: TallyTextStyle;
}): React.ReactElement {
  return (
    <>
      {model.count !== undefined && (
        <Typography
          allowFontScaling={false}
          className="font-sora-semibold text-foreground tabular-nums"
          style={textStyle}
        >
          {`${model.count} `}
        </Typography>
      )}
      <Typography
        allowFontScaling={false}
        className="font-inter-semibold text-content-secondary"
        style={textStyle}
      >
        {model.label}
      </Typography>
      {model.filterSummary !== undefined && ` ${model.filterSummary}`}
    </>
  );
}

function TallyLine({
  model,
  fontSize,
}: {
  model: SearchTallyModel;
  fontSize: number;
}): React.ReactElement {
  const textStyle = { fontSize, lineHeight: lineHeightFor(fontSize) };
  return (
    <>
      {model.lead === undefined ? (
        // One tail-ellipsised line: the summary truncates first, then the label; spaces, since RN Android drops margins on inline text.
        <Typography
          allowFontScaling={false}
          numberOfLines={1}
          ellipsizeMode="tail"
          className="font-inter text-content-secondary"
          style={[COUNT_LINE_STYLE, textStyle]}
        >
          <TallyWords model={model} textStyle={textStyle} />
        </Typography>
      ) : (
        <View style={LEAD_ROW_STYLE}>
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            ellipsizeMode="tail"
            className="font-inter-semibold text-content-secondary"
            style={[SEARCH_TALLY_LEAD_STYLE, textStyle]}
          >
            {model.lead}
          </Typography>
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            className="font-inter text-content-secondary"
            style={[SEARCH_TALLY_WHOLE_STYLE, textStyle]}
          >
            {' '}
            <TallyWords model={model} textStyle={textStyle} />
          </Typography>
        </View>
      )}
      {model.sum !== undefined && (
        <View style={SUM_GROUP_STYLE}>
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            className={`font-sora-semibold tabular-nums ${FLOW_CLASS[model.sum.polarity]}`}
            style={textStyle}
          >
            {model.sum.text}
          </Typography>
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            className="font-inter text-content-secondary"
            style={textStyle}
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
  testID,
}: {
  model: SearchTallyModel;
  testID: string;
}): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const geometry = resolveSearchTallyGeometry(fontScale);
  return (
    <View
      testID={testID}
      className="px-4"
      style={[SLOT_STYLE, { height: geometry.slotHeight }]}
      accessible={model.accessibilityLabel !== undefined}
      // React Native Android writes a content description only for a non-null label, so '' clears the last one.
      accessibilityLabel={model.accessibilityLabel ?? ''}
    >
      {model.mode === 'skeleton' ? (
        <Skeleton className="w-1/2 rounded-md" style={{ height: geometry.lineHeight }} />
      ) : model.mode === 'empty' ? null : (
        <TallyLine model={model} fontSize={scaledFontSize(Type.micro, fontScale)} />
      )}
    </View>
  );
});
